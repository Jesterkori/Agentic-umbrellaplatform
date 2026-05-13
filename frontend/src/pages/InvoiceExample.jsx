import React from 'react';
import Invoice from '../components/Invoice';

const InvoiceExample = () => {
  const sampleInvoiceData = {
    invoiceRef: "INV100003",
    invoiceDate: "18/10/2024",
    paymentDue: "18/10/2024",
    accountNo: "1070436",
    poRef: "",
    projectRef: "",
    currency: "GBP",
    clientName: "Solutions",
    companyName: "OM & CO Pvt Limited",
    companyRegNo: "15446929",
    vatRegNo: "468850642",
    bankName: "HSBC",
    bankAccountNo: "71001213",
    sortCode: "404157",
    items: [
      {
        description: "Contractor: 86005 Sam Arth",
        code: "DN1002",
        quantity: "37.50",
        price: "25.00",
        net: "937.50",
        vat: "187.50",
        amount: "1,125.00"
      }
    ],
    totalNet: "937.50",
    totalVat: "187.50",
    totalAmount: "1125.00"
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Invoice Example</h1>
      <Invoice invoiceData={sampleInvoiceData} />
    </div>
  );
};

export default InvoiceExample;
