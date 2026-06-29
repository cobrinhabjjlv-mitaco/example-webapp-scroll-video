// Mock API for Phase 1

window.mockSubmitLead = async function(phoneNumber) {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 800));
  return { success: true, leadId: "mock_" + Date.now(), message: "Lead captured (mock)" };
};

window.mockCheckout = async function(shippingData, paymentData) {
  await new Promise(r => setTimeout(r, 1500)); // simulate processing
  return {
    success: true,
    orderId: "mock_order_" + Date.now(),
    trackingCode: "1Z999AA10123456784",
    labelUrl: "https://example.com/mock-label.pdf",
    message: "Payment successful (mock)"
  };
};
