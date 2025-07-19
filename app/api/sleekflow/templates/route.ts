// /app/api/sleekflow/templates/route.ts

import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Ensures this route is not cached

export async function GET(request: Request) {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.SLEEKFLOW_API_KEY;
    
    if (!apiKey) {
      console.error('SLEEKFLOW_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Sleekflow API key not configured' },
        { status: 500 }
      );
    }
    
   // Extract query parameters from request URL
const { searchParams } = new URL(request.url);
// Try to get from query params first, then fall back to env variable
const channelNumber = searchParams.get('channelNumber') || process.env.SLEEKFLOW_CHANNEL_NUMBER;

// Check if channelNumber is available
if (!channelNumber) {
  console.error('SLEEKFLOW_CHANNEL_NUMBER environment variable is not set and no channelNumber provided in query');
  return NextResponse.json(
    { error: 'WhatsApp channel number not configured' },
    { status: 500 }
  );
}

// Build URL with required channelNumber parameter
const url = `https://api.sleekflow.io/api/cloudapi/template?channelNumber=${channelNumber}`;
    
    // Call the Sleekflow API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Sleekflow-Api-Key': apiKey
      }
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Sleekflow API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to fetch templates from Sleekflow' },
        { status: response.status }
      );
    }
    
    // Parse the response
    const data = await response.json();
    
    // Return just the whatsappTemplates array
    return NextResponse.json({ templates: data.whatsappTemplates || [] });
    
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}