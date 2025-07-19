// /app/api/sleekflow/send/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic'; // Ensures this route is not cached

// Initialize Supabase client - CORRECT for server-side usage
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Define the request body interface
interface SendMessageRequest {
  // Can handle either a single customer or an array of customers
  customers?: {
    customer_id: string;
    phone: string;
    first_name?: string;
    last_name?: string;
  }[];
  // Single customer fields
  customerId?: string;
  phone?: string;
  customerName?: string;
  // Template info
  templateId: string;
  templateName?: string;
  templateLanguage?: string;
  templateParameters?: Record<string, string>;
}

export async function POST(request: Request) {
  try {
    // Get API credentials from environment variables
    const apiKey = process.env.SLEEKFLOW_API_KEY;
    const channelNumber = process.env.SLEEKFLOW_CHANNEL_NUMBER;
    
    if (!apiKey) {
      console.error('SLEEKFLOW_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'Sleekflow API key not configured' }, { status: 500 });
    }
    
    if (!channelNumber) {
      console.error('SLEEKFLOW_CHANNEL_NUMBER environment variable is not set');
      return NextResponse.json({ error: 'WhatsApp channel number not configured' }, { status: 500 });
    }
    
    // Parse request body
    const body: SendMessageRequest = await request.json();
    const { customers, customerId, phone, customerName, templateId } = body;
    
    // Handle both array of customers and single customer formats
    let customersToProcess = [];
    
    if (customers && Array.isArray(customers) && customers.length > 0) {
      customersToProcess = customers;
    } else if (phone && customerId) {
      // Handle single customer format
      customersToProcess = [{
        customer_id: customerId,
        phone,
        first_name: customerName ? customerName.split(' ')[0] : undefined,
        last_name: customerName ? customerName.split(' ').slice(1).join(' ') : undefined
      }];
    } else {
      return NextResponse.json({ error: 'No customers provided' }, { status: 400 });
    }
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }
    
    // Results array to track success/failure for each customer
    const results = [];
    
    // Process each customer one by one
    for (const customer of customersToProcess) {
      try {
        // Check if customer has required phone
        if (!customer.phone) {
          results.push({
            customer_id: customer.customer_id,
            success: false,
            error: 'Phone number is required'
          });
          continue;
        }
        
        // Format the phone number per Sleekflow requirements
        const formattedPhone = formatPhoneNumber(customer.phone);
        
        // Find selected template from API to get template name if we don't have it
        // For now we'll assume templateId is the template name
        const templateName = body.templateName || templateId;
        const templateLanguage = body.templateLanguage || "zh_HK";
        
        // Build the WhatsApp message payload according to Sleekflow API requirements
        const payload = {
          "channel": "whatsappcloudapi",
          "from": channelNumber,
          "to": formattedPhone,
          "messageType": "template",
          "extendedMessage": {
            "WhatsappCloudApiTemplateMessageObject": {
              "templateName": templateName,
              "language": templateLanguage,
              "components": body.templateParameters ? Object.entries(body.templateParameters).map(([key, value]) => ({
                "type": "body",
                "parameters": [{
                  "type": "text",
                  "text": value
                }]
              })) : []
            }
          }
        };
        
        // Call the Sleekflow API
        const response = await fetch('https://api.sleekflow.io/api/message/send/json', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Sleekflow-Api-Key': apiKey
          },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Sleekflow API error:', {
            customer: customer.customer_id,
            status: response.status,
            data
          });
          
          results.push({
            customer_id: customer.customer_id,
            success: false,
            error: `API Error: ${response.status} - ${data.error || 'Unknown error'}`
          });
          continue;
        }
        
        // Log successful message to our database
        const { error: logError } = await supabase
          .from('production.message_logs')
          .insert({
            customer_id: customer.customer_id,
            channel: 'whatsapp',
            template_name: templateName,
            sent_at: new Date().toISOString(),
            success: true,
            recipient_phone: formattedPhone
          });
        
        if (logError) {
          console.error('Error logging message:', logError);
        }
        
        results.push({
          customer_id: customer.customer_id,
          success: true,
          messageId: data.id || data.messageId
        });
        
      } catch (customerError) {
        console.error('Error processing customer:', customer.customer_id, customerError);
        results.push({
          customer_id: customer.customer_id,
          success: false,
          error: customerError.message || 'Unknown error'
        });
      }
    }
    
    // Return the results for all customers
    return NextResponse.json({
      totalCustomers: customersToProcess.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results
    });
    
  } catch (error) {
    console.error('Error sending messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to format phone numbers for Sleekflow API
function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and parentheses
  let formatted = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove + if it exists (Sleekflow requires no + prefix)
  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1);
  }
  
  return formatted;
}