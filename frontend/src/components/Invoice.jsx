import React from 'react';
import LogoMark from './LogoMark';

const Invoice = ({ invoiceData = {} }) => {
  const {
    invoiceRef = "INV100003",
    invoiceDate = "18/10/2024",
    paymentDue = "18/10/2024",
    accountNo = "1070436",
    poRef = "",
    projectRef = "",
    currency = "GBP",
    clientName = "Solutions",
    companyName = "OM & CO Pvt Limited",
    companyRegNo = "15446929",
    vatRegNo = "468850642",
    bankName = "HSBC",
    bankAccountNo = "71001213",
    sortCode = "404157",
    items = [
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
    totalNet = "937.50",
    totalVat = "187.50",
    totalAmount = "1125.00"
  } = invoiceData;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px', border: '1px solid #ddd' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        {/* Logo and Company Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '5px' }}>
          <LogoMark compact />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#008080' }}>OMBRELLA</div>
            <div style={{ fontSize: '10px', color: '#666' }}>Business The Future</div>
          </div>
        </div>

        {/* Invoice Title and Details */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>INVOICE</div>
          <div style={{ fontSize: '12px', marginBottom: '5px' }}>
            <strong>Invoice Reference:</strong> {invoiceRef}
          </div>
          <div style={{ fontSize: '12px' }}>
            <strong>Date:</strong> {invoiceDate}
          </div>
        </div>
      </div>

      {/* Company and Client Information */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>To:</div>
          <div style={{ fontSize: '12px' }}>{clientName}</div>
          <div style={{ fontSize: '12px' }}>123 Client Street</div>
          <div style={{ fontSize: '12px' }}>Client City, Postcode</div>
          <div style={{ fontSize: '12px' }}>Country</div>
        </div>
        
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>From:</div>
          <div style={{ fontSize: '12px' }}>{companyName}</div>
          <div style={{ fontSize: '12px' }}>123 Company Street</div>
          <div style={{ fontSize: '12px' }}>Company City, Postcode</div>
          <div style={{ fontSize: '12px' }}>Country</div>
        </div>
      </div>

      {/* Account Information */}
      <div style={{ backgroundColor: '#008080', color: 'white', padding: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <div><strong>A/C NO</strong></div>
        <div><strong>PO Ref.</strong></div>
        <div><strong>Project Ref.</strong></div>
        <div><strong>Currency</strong></div>
        <div><strong>Payment Due</strong></div>
      </div>
      
      <div style={{ backgroundColor: '#f0f0f0', padding: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '2px solid #008080' }}>
        <div>{accountNo}</div>
        <div>{poRef || '-'}</div>
        <div>{projectRef || '-'}</div>
        <div>{currency}</div>
        <div>{paymentDue}</div>
      </div>

      {/* Items Table */}
      <div style={{ backgroundColor: '#008080', color: 'white', padding: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '20px' }}>
        <div style={{ flex: 3 }}><strong>Description</strong></div>
        <div style={{ flex: 1 }}><strong>Code</strong></div>
        <div style={{ flex: 1 }}><strong>Quantity</strong></div>
        <div style={{ flex: 1 }}><strong>Price</strong></div>
        <div style={{ flex: 1 }}><strong>Net</strong></div>
        <div style={{ flex: 1 }}><strong>VAT</strong></div>
        <div style={{ flex: 1 }}><strong>Amount</strong></div>
      </div>

      {items.map((item, index) => (
        <div key={index} style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid #ddd' }}>
          <div style={{ flex: 3 }}>{item.description}</div>
          <div style={{ flex: 1 }}>{item.code}</div>
          <div style={{ flex: 1 }}>{item.quantity}</div>
          <div style={{ flex: 1 }}>{item.price}</div>
          <div style={{ flex: 1 }}>{item.net}</div>
          <div style={{ flex: 1 }}>{item.vat}</div>
          <div style={{ flex: 1 }}>{item.amount}</div>
        </div>
      ))}

      {/* Payment Details and Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '12px' }}>Please Remit Payment To:</div>
          <div style={{ fontSize: '12px' }}><strong>A/c Name:</strong> {bankName}</div>
          <div style={{ fontSize: '12px' }}><strong>A/c No:</strong> {bankAccountNo}</div>
          <div style={{ fontSize: '12px' }}><strong>Sort code:</strong> {sortCode}</div>
        </div>
        
        <div style={{ textAlign: 'right', minWidth: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
            <div><strong>Net</strong></div>
            <div>{totalNet}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
            <div><strong>VAT</strong></div>
            <div>{totalVat}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
            <div><strong>Total</strong></div>
            <div>{totalAmount}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '10px', color: '#666', textAlign: 'center' }}>
        <div><strong>Company Reg. Number:</strong> {companyRegNo}</div>
        <div><strong>VAT Registration Number:</strong> {vatRegNo}</div>
      </div>
    </div>
  );
};

export default Invoice;
