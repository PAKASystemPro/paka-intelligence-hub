'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, X, CheckCircle, Send, MessageSquare, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Define the BroadcastCustomer interface
interface BroadcastCustomer {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

// Define the WhatsApp template interface
interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

// Define the send message response
interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export default function BroadcastPage() {
  // State for customers and loading status
  const [customers, setCustomers] = useState<BroadcastCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateParameters, setTemplateParameters] = useState<Record<string, string>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const [sendingStatus, setSendingStatus] = useState<{
    inProgress: boolean;
    sent: string[];
    failed: string[];
    current?: string;
  }>({ inProgress: false, sent: [], failed: [] });
  
  // Show notification helper
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ visible: true, message, type });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Load customers from localStorage on component mount
  useEffect(() => {
    try {
      // Only run this code client-side
      if (typeof window !== 'undefined') {
        // Get customers from localStorage
        const storedCustomers = localStorage.getItem('whatsappBroadcastCustomers');
        
        if (storedCustomers) {
          // Parse the stored JSON string
          const parsedCustomers = JSON.parse(storedCustomers);
          setCustomers(parsedCustomers);
          
          // Remove the data from localStorage to prevent accidental re-use
          localStorage.removeItem('whatsappBroadcastCustomers');
        }
      }
    } catch (error) {
      console.error('Error loading customers from localStorage:', error);
    } finally {
      setIsLoading(false);
    }

    // Load WhatsApp templates
    fetchTemplates();
  }, []);

  // Fetch WhatsApp templates from API
  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch('/api/sleekflow/templates');
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
      
      // Select first template by default if available
      if (data.templates && data.templates.length > 0) {
        setSelectedTemplateId(data.templates[0].id);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      showNotification('Failed to load WhatsApp templates. Please try again.', 'error');
    } finally {
      setTemplatesLoading(false);
    }
  };  

  // Handle removing a customer from the list
  const handleRemoveCustomer = (customerId: string) => {
    setCustomers((prevCustomers) => 
      prevCustomers.filter((customer) => customer.customer_id !== customerId)
    );
  };

  // Get selected template
  const selectedTemplate = templates.find(template => template.id === selectedTemplateId);
  
  // When template changes, extract parameters and create state for them
  useEffect(() => {
    if (selectedTemplate) {
      // Try to extract parameters from template components
      try {
        const params: Record<string, string> = {};
        // Scan through components to find parameters
        selectedTemplate.components?.forEach(component => {
          if (component.type === "BODY" && component.text) {
            // Find all parameters in format {{n}}
            const paramMatches = component.text.match(/\{\{(\d+)\}\}/g) || [];
            
            // Create placeholder values for parameters
            paramMatches.forEach((match: string) => {
              const paramNumber = match.replace(/[{}]/g, '');
              params[paramNumber] = `[Parameter ${paramNumber}]`;
            });
          }
        });
        
        setTemplateParameters(params);
      } catch (error) {
        console.error('Error parsing template parameters:', error);
      }
    } else {
      // Reset parameters if no template selected
      setTemplateParameters({});
    }
  }, [selectedTemplate]);
  
  // Helper to render message preview with parameters
  const renderMessagePreview = () => {
    if (!selectedTemplate) return null;
    
    try {
      // Find message components to display
      return selectedTemplate.components?.map((component, index) => {
        if (component.type === "HEADER" && component.text) {
          return (
            <p key={`header-${index}`} className="font-bold mb-2">
              {insertParameters(component.text, templateParameters)}
            </p>
          );
        }
        
        if (component.type === "BODY" && component.text) {
          return (
            <p key={`body-${index}`} className="mb-2 whitespace-pre-line">
              {insertParameters(component.text, templateParameters)}
            </p>
          );
        }
        
        if (component.type === "FOOTER" && component.text) {
          return (
            <p key={`footer-${index}`} className="text-sm text-gray-500 mt-2">
              {insertParameters(component.text, templateParameters)}
            </p>
          );
        }
        
        return null;
      });
    } catch (error) {
      console.error('Error rendering message preview:', error);
      return <p className="text-red-500">Error rendering preview</p>;
    }
  };
  
  // Helper function to replace parameters in text
  const insertParameters = (text: string, params: Record<string, string>) => {
    if (!text) return '';
    
    // Replace all {{n}} with their parameter values
    return text.replace(/\{\{(\d+)\}\}/g, (match: string, paramNumber: string) => {
      return params[paramNumber] || match;
    });
  };

  // Handle template change
  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
  };

  // Send WhatsApp broadcast
  const sendBroadcast = async () => {
    // Validate template selection
    if (!selectedTemplateId) {
      showNotification('Please select a WhatsApp template before sending.', 'error');
      return;
    }

    // Validate customers have phone numbers
    const customersWithoutPhone = customers.filter(c => !c.phone);
    if (customersWithoutPhone.length > 0) {
      showNotification(`${customersWithoutPhone.length} customer(s) don't have phone numbers and will be skipped.`, 'warning');
    }

    // Reset sending status
    setSendingStatus({
      inProgress: true,
      sent: [],
      failed: []
    });

    try {
      // Process each customer with a phone number
      for (const customer of customers.filter(c => c.phone)) {
        // Update current customer being processed
        setSendingStatus(prev => ({
          ...prev,
          current: `${customer.first_name} ${customer.last_name}`
        }));

        try {
          // Make sure phone number exists and get template name from the selected template
          if (!customer.phone || !selectedTemplate) {
            throw new Error('Missing phone number or template');
          }
          
          // Phone number must not include '+' as per Sleekflow requirements
          const phoneWithoutPlus = customer.phone.startsWith('+') ? 
            customer.phone.substring(1) : customer.phone;
            
          // Include any template parameters in the request
          const paramsToSend = Object.keys(templateParameters).length > 0 ? { templateParameters } : {};
            
          const response = await fetch('/api/sleekflow/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: phoneWithoutPlus,
              templateId: selectedTemplateId,
              templateName: selectedTemplate.name, // Send the template name
              templateLanguage: selectedTemplate.language || 'zh_HK',
              customerId: customer.customer_id,
              customerName: `${customer.first_name} ${customer.last_name}`,
              templateParameters: templateParameters // Include template parameters
            })
          });

          const result = await response.json();
          console.log('Sleekflow API response:', result);

          // Always mark as successful if we get a response and no explicit error
          // Since the message is actually being delivered despite the response not having success: true
          if (response.ok && !result.error) {
            // Update success count
            setSendingStatus(prev => ({
              ...prev,
              sent: [...prev.sent, customer.customer_id]
            }));
          } else {
            console.error('Failed response:', result);
            // Update failure count
            setSendingStatus(prev => ({
              ...prev,
              failed: [...prev.failed, customer.customer_id]
            }));
            console.error(`Failed to send to ${customer.first_name} ${customer.last_name}:`, result.error);
          }

          // Add a small delay between requests to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error sending to ${customer.first_name} ${customer.last_name}:`, error);
          setSendingStatus(prev => ({
            ...prev,
            failed: [...prev.failed, customer.customer_id]
          }));
        }
      }

      // Show final status
      const type = sendingStatus.failed.length === 0 ? 'success' : 'warning';
      showNotification(`Broadcast Complete. Successfully sent: ${sendingStatus.sent.length}, Failed: ${sendingStatus.failed.length}`, type);
      
      // Reset current customer
      setSendingStatus(prev => ({ ...prev, current: undefined }));

    } catch (error) {
      console.error('Error during broadcast:', error);
      showNotification('An error occurred while sending the broadcast.', 'error');
    } finally {
      setSendingStatus(prev => ({ ...prev, inProgress: false, current: undefined }));
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">WhatsApp Broadcast</h1>
      
      {notification && (
        <div className={`mb-6 p-4 border rounded-md ${
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        } flex items-start gap-3`}>
          {notification.type === 'error' && <AlertCircle className="h-5 w-5 mt-0.5" />}
          {notification.type === 'warning' && <AlertCircle className="h-5 w-5 mt-0.5" />}
          {notification.type === 'success' && <CheckCircle className="h-5 w-5 mt-0.5" />}
          {notification.type === 'info' && <Info className="h-5 w-5 mt-0.5" />}
          <div>
            <p className="font-medium">{notification.message}</p>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="ml-auto text-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p>Loading...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-4">No customers selected. Please return to the retention analysis page to select customers.</p>
          <Link href="/analytics/retention">
            <Button>Return to Retention Analysis</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <h2 className="text-xl font-medium">You are about to message {customers.length} customers</h2>
          
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const isSent = sendingStatus.sent.includes(customer.customer_id);
                  const isFailed = sendingStatus.failed.includes(customer.customer_id);
                  const isCurrentlySending = sendingStatus.inProgress && sendingStatus.current === `${customer.first_name} ${customer.last_name}`;
                  
                  return (
                    <TableRow key={customer.customer_id}>
                      <TableCell>{`${customer.first_name} ${customer.last_name}`}</TableCell>
                      <TableCell>{customer.email || 'N/A'}</TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <span className="font-medium">{customer.phone}</span>
                        ) : (
                          <Badge variant="destructive">Missing</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isCurrentlySending ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending
                          </Badge>
                        ) : isSent ? (
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" /> Sent
                          </Badge>
                        ) : isFailed ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveCustomer(customer.customer_id)}
                          disabled={sendingStatus.inProgress}
                          className="flex items-center"
                        >
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Select Message Template</CardTitle>
              <CardDescription>
                Choose a WhatsApp message template to send to the selected customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Loading templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">No templates available</h4>
                      <p>No WhatsApp templates were found. Please ensure your SleekFlow account has approved templates.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Templates</SelectLabel>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.language})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {selectedTemplate && (
                    <div className="mt-4 p-4 border rounded-md bg-gray-50">
                      <div className="mt-8">
                        <h3 className="text-lg font-medium mb-2">Template Preview:</h3>
                        
                        {selectedTemplate ? (
                          <div className="border rounded-md p-4 bg-gray-50">
                            <div className="mb-4">
                              <p><strong>Name:</strong> {selectedTemplate.name}</p>
                              <p><strong>Language:</strong> {selectedTemplate.language}</p>
                              <p><strong>Category:</strong> {selectedTemplate.category}</p>
                              <p><strong>Status:</strong> {selectedTemplate.status}</p>
                            </div>
                            
                            <div className="mt-6">
                              <h4 className="text-md font-medium mb-2">Message Content:</h4>
                              <div className="bg-white border rounded-md p-4 mb-4">
                                {renderMessagePreview()}
                              </div>
                              
                              {Object.keys(templateParameters).length > 0 && (
                                <div className="mt-4">
                                  <h4 className="text-md font-medium mb-2">Edit Parameters:</h4>
                                  <div className="space-y-3">
                                    {Object.entries(templateParameters).map(([key, value]) => (
                                      <div key={key} className="flex items-center gap-3">
                                        <span className="text-sm font-medium w-24">Parameter {key}:</span>
                                        <input 
                                          type="text"
                                          className="flex-1 border rounded-md px-3 py-1.5 text-sm" 
                                          value={value}
                                          onChange={(e) => {
                                            setTemplateParameters(prev => ({
                                              ...prev,
                                              [key]: e.target.value
                                            }));
                                          }}
                                          placeholder={`Value for parameter ${key}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500">Select a template to see preview</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                className="flex items-center gap-2 px-6 py-5 text-base"
                disabled={sendingStatus.inProgress || !selectedTemplateId || templates.length === 0 || customers.filter(c => c.phone).length === 0}
                onClick={sendBroadcast}
              >
                {sendingStatus.inProgress ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending... ({sendingStatus.sent.length + sendingStatus.failed.length}/{customers.filter(c => c.phone).length})
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Send WhatsApp Broadcast
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
