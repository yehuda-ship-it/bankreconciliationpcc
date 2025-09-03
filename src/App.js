import React, { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const trackUsage = async (data) => {
  console.log('trackUsage called with:', data);
  
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfG_3KkUupE-_dHmxnmh7pylok8b_z-amopp_tZg_2-uFUvDA/formResponse';
  
  const now = new Date();
  const formData = new FormData();
  
  // Map your data to the correct form fields
  formData.append('entry.675496748', now.toLocaleDateString()); // Date
  formData.append('entry.538159220', now.toLocaleTimeString()); // Time
  formData.append('entry.755585704', data.facility || 'Unknown'); // Facility
  formData.append('entry.976613466', data.template || 'Manual'); // Template Used
  formData.append('entry.1475915948', data.transactionCount || 0); // Transaction Count
  formData.append('entry.221412348', data.status || 'Success'); // Status
  formData.append('entry.153128502', `session_${Date.now()}`); // User ID

  console.log('Submitting to Google Form...');

  try {
    await fetch(FORM_URL, {
      method: 'POST',
      body: formData,
      mode: 'no-cors' // Important for Google Forms
    });
    console.log('✅ Usage tracked successfully via Google Form');
  } catch (error) {
    console.error('❌ Tracking failed:', error);
  }
};
    

function App() {
  const [pccFiles, setPccFiles] = useState([]);
  const [bankFiles, setBankFiles] = useState([]);
  const [pccData, setPccData] = useState([]);
  const [selectedBankFile, setSelectedBankFile] = useState(null);
  const [bankData, setBankData] = useState([]);
  const [bankColumns, setBankColumns] = useState([]);
  const [bankColumnMappings, setBankColumnMappings] = useState({
    bankIdentifier: '',
    amount: '',
    date: '',
    description: ''
  });
  const [pccBanks, setPccBanks] = useState([]);
  const [bankMapping, setBankMapping] = useState({});
  const [selectedPccBank, setSelectedPccBank] = useState('');
  const [reconciliationResults, setReconciliationResults] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Template-related state
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showCustomMapping, setShowCustomMapping] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // State for expandable sections
  const [showMatches, setShowMatches] = useState(false);
  const [showPccUnmatched, setShowPccUnmatched] = useState(false);
  const [showBankUnmatched, setShowBankUnmatched] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState(false);
  const [expandedPccUnmatched, setExpandedPccUnmatched] = useState(false);
  const [expandedBankUnmatched, setExpandedBankUnmatched] = useState(false);

  // Load templates from localStorage on component mount
  useEffect(() => {
    const templates = localStorage.getItem('bankReconciliationTemplates');
    if (templates) {
      setSavedTemplates(JSON.parse(templates));
    }
  }, []);

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const cardStyle = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    border: '1px solid #e5e7eb',
    maxWidth: '1200px',
    margin: '0 auto 16px auto'
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: '6px'
  };

  const subtitleStyle = {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: '16px',
    marginBottom: '24px'
  };

  const buttonStyle = {
    backgroundColor: '#111827',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600'
  };

  const buttonDisabledStyle = {
    ...buttonStyle,
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  };

  const uploadAreaStyle = {
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '16px 12px',
    textAlign: 'center',
    backgroundColor: '#fafafa',
    margin: '8px 0',
    cursor: 'pointer'
  };

  const fileItemStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '8px'
  };

  const selectStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
    fontSize: '16px'
  };

  const progressStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    margin: '20px 0'
  };

  const stepStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    border: '2px solid'
  };

  const activeStepStyle = {
    ...stepStyle,
    backgroundColor: '#111827',
    color: 'white',
    borderColor: '#111827'
  };

  const inactiveStepStyle = {
    ...stepStyle,
    backgroundColor: 'white',
    color: '#6b7280',
    borderColor: '#d1d5db'
  };

  // Template styles
  const templateCardStyle = {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    backgroundColor: 'white',
    transition: 'all 0.2s',
    marginBottom: '16px'
  };

  // File handling functions
  const handleFileUpload = useCallback((files, type) => {
    const fileArray = Array.from(files);
    if (type === 'pcc') {
      setPccFiles(prev => [...prev, ...fileArray]);
    } else {
      setBankFiles(prev => [...prev, ...fileArray]);
    }
  }, []);

  const removeFile = (index, type) => {
    if (type === 'pcc') {
      setPccFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setBankFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const processPccFiles = async () => {
    if (pccFiles.length === 0) return;
    
    setLoading(true);
    let allPccData = [];
    
    for (const file of pccFiles) {
      try {
        const text = await file.text();
        const parsed = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        const hasRequiredColumns = parsed.meta.fields?.includes('Bank Account Description') && 
                                  parsed.meta.fields?.includes('Batch Number') &&
                                  parsed.meta.fields?.includes('Amount');
        
        if (hasRequiredColumns) {
          allPccData = [...allPccData, ...parsed.data.filter(row => row['Bank Account Description'])];
        } else {
          alert(`File "${file.name}" doesn't appear to be a valid PCC Cash Receipt Journal`);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        alert(`Error processing file "${file.name}"`);
      }
    }
    
    if (allPccData.length > 0) {
      setPccData(allPccData);
      const uniqueBanks = [...new Set(allPccData.map(row => row['Bank Account Description']))];
      setPccBanks(uniqueBanks);
      setStep(2);
    }
    
    setLoading(false);
  };

  const analyzeBankFile = async (file) => {
    setLoading(true);
    try {
      let data;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const parsed = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        data = parsed.data;
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      }
      
      if (data.length > 0) {
        setBankData(data);
        setBankColumns(Object.keys(data[0]));
        setSelectedBankFile(file);
        setShowCustomMapping(false); // Always start with template selection
        setStep(3);
      }
    } catch (error) {
      console.error('Error analyzing bank file:', error);
      alert(`Error analyzing file "${file.name}"`);
    }
    setLoading(false);
  };

  const handleColumnMapping = (mappingType, column) => {
    setBankColumnMappings(prev => ({
      ...prev,
      [mappingType]: column
    }));
  };

  // Template functions
  const saveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const newTemplate = {
      id: Date.now(),
      name: templateName,
      mapping: { 
        bankIdentifier: bankColumnMappings.bankIdentifier,
        amount: bankColumnMappings.amount,
        date: bankColumnMappings.date,
        description: bankColumnMappings.description
      }
    };

    const updatedTemplates = [...savedTemplates, newTemplate];
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('bankReconciliationTemplates', JSON.stringify(updatedTemplates));
    
    setTemplateName('');
    alert('Template saved successfully!');
  };

  const loadTemplate = (template) => {
    setBankColumnMappings(template.mapping);
    setStep(4); // Skip directly to Step 4 when using a template
  };

  const deleteTemplate = (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
      setSavedTemplates(updatedTemplates);
      localStorage.setItem('bankReconciliationTemplates', JSON.stringify(updatedTemplates));
    }
  };

  const proceedToMapping = () => {
    if (bankColumnMappings.bankIdentifier && bankColumnMappings.amount && bankColumnMappings.date) {
      setStep(4);
    }
  };

  const handleBankMapping = (pccBank, bankId) => {
    setBankMapping(prev => ({
      ...prev,
      [pccBank]: bankId
    }));
  };

  const performReconciliation = () => {
    if (!selectedPccBank || !bankMapping[selectedPccBank]) return;

    const mappedBankId = bankMapping[selectedPccBank];
    
    const pccBankData = pccData.filter(row => row['Bank Account Description'] === selectedPccBank);
    
    const pccBatches = {};
    pccBankData.forEach(row => {
      const batchNum = row['Batch Number'];
      if (!pccBatches[batchNum]) {
        pccBatches[batchNum] = {
          batchNumber: batchNum,
          description: row['Batch Description'],
          postingDate: row['Posting Date'],
          totalAmount: 0,
          transactions: []
        };
      }
      pccBatches[batchNum].totalAmount += parseFloat(row['Amount'] || 0);
      pccBatches[batchNum].transactions.push(row);
    });

    const bankTransactions = bankData.filter(row => 
      String(row[bankColumnMappings.bankIdentifier]) === String(mappedBankId)
    );

    const pccTotal = Object.values(pccBatches).reduce((sum, batch) => sum + batch.totalAmount, 0);
    const bankTotal = bankTransactions.reduce((sum, txn) => sum + parseFloat(txn[bankColumnMappings.amount] || 0), 0);

    const matches = [];
    const unmatchedPcc = [];
    const unmatchedBank = [...bankTransactions];

    Object.values(pccBatches).forEach(batch => {
      const matchingBank = unmatchedBank.find(btxn => 
        Math.abs(parseFloat(btxn[bankColumnMappings.amount]) - batch.totalAmount) < 0.01
      );
      
      if (matchingBank) {
        matches.push({
          pccBatch: batch,
          bankTransaction: matchingBank,
          difference: 0
        });
        const index = unmatchedBank.indexOf(matchingBank);
        unmatchedBank.splice(index, 1);
      } else {
        unmatchedPcc.push(batch);
      }
    });

    setReconciliationResults({
      pccTotal,
      bankTotal,
      difference: pccTotal - bankTotal,
      totalMatches: matches.length,
      matches,
      unmatchedPcc,
      unmatchedBank,
      selectedPccBank,
      mappedBankId
    });

trackUsage({
  facility: selectedPccBank, // Using PCC bank as facility
  template: savedTemplates.find(t => 
    t.mapping.bankIdentifier === bankColumnMappings.bankIdentifier &&
    t.mapping.amount === bankColumnMappings.amount &&
    t.mapping.date === bankColumnMappings.date
  )?.name || 'Manual Mapping',
  transactionCount: bankData.length,
  status: 'Success'
});
    setStep(5);
  };

  const exportToExcel = () => {
    if (!reconciliationResults) return;

    const wb = XLSX.utils.book_new();

    // Summary Tab
    const summaryData = [
      ['PCC Bank Reconciliation Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Bank Reconciliation Summary'],
      ['PCC Bank Account:', reconciliationResults.selectedPccBank],
      ['Bank Identifier:', reconciliationResults.mappedBankId],
      [''],
      ['Financial Summary'],
      ['PCC Total:', reconciliationResults.pccTotal.toFixed(2)],
      ['Bank Total:', reconciliationResults.bankTotal.toFixed(2)],
      ['Difference:', reconciliationResults.difference.toFixed(2)],
      ['Status:', Math.abs(reconciliationResults.difference) < 0.01 ? 'MATCHED' : 'DISCREPANCY'],
      [''],
      ['Reconciliation Counts'],
      ['Successful Matches:', reconciliationResults.matches.length],
      ['PCC Unmatched:', reconciliationResults.unmatchedPcc.length],
      ['Bank Unmatched:', reconciliationResults.unmatchedBank.length]
    ];
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

    // Matches Tab
    if (reconciliationResults.matches.length > 0) {
      const matchesData = [
        ['Successful Matches'],
        [''],
        ['PCC Batch Number', 'PCC Description', 'PCC Amount', 'PCC Posting Date', 'Bank Amount', 'Bank Date', 'Difference']
      ];
      
      reconciliationResults.matches.forEach(match => {
        matchesData.push([
          match.pccBatch.batchNumber,
          match.pccBatch.description,
          match.pccBatch.totalAmount.toFixed(2),
          match.pccBatch.postingDate,
          parseFloat(match.bankTransaction[bankColumnMappings.amount]).toFixed(2),
          match.bankTransaction[bankColumnMappings.date],
          match.difference.toFixed(2)
        ]);
      });
      
      const matchesWS = XLSX.utils.aoa_to_sheet(matchesData);
      XLSX.utils.book_append_sheet(wb, matchesWS, 'Matches');
    }

    // PCC Unmatched Tab
    if (reconciliationResults.unmatchedPcc.length > 0) {
      const pccUnmatchedData = [
        ['PCC Batches Without Bank Matches'],
        [''],
        ['Batch Number', 'Description', 'Amount', 'Posting Date', 'Transaction Count']
      ];
      
      reconciliationResults.unmatchedPcc.forEach(batch => {
        pccUnmatchedData.push([
          batch.batchNumber,
          batch.description,
          batch.totalAmount.toFixed(2),
          batch.postingDate,
          batch.transactions.length
        ]);
      });
      
      const pccUnmatchedWS = XLSX.utils.aoa_to_sheet(pccUnmatchedData);
      XLSX.utils.book_append_sheet(wb, pccUnmatchedWS, 'PCC Unmatched');
    }

    // Bank Unmatched Tab
    if (reconciliationResults.unmatchedBank.length > 0) {
      const bankUnmatchedData = [
        ['Bank Transactions Without PCC Matches'],
        [''],
        ['Bank Identifier', 'Amount', 'Date', 'Description']
      ];
      
      reconciliationResults.unmatchedBank.forEach(txn => {
        bankUnmatchedData.push([
          txn[bankColumnMappings.bankIdentifier],
          parseFloat(txn[bankColumnMappings.amount]).toFixed(2),
          txn[bankColumnMappings.date],
          txn[bankColumnMappings.description] || ''
        ]);
      });
      
      const bankUnmatchedWS = XLSX.utils.aoa_to_sheet(bankUnmatchedData);
      XLSX.utils.book_append_sheet(wb, bankUnmatchedWS, 'Bank Unmatched');
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Bank_Reconciliation_${reconciliationResults.selectedPccBank.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Render functions
  const renderFileUpload = (title, description, files, type, accept) => (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{title}</h3>
      <p style={{ color: '#6b7280', marginBottom: '8px', fontSize: '13px' }}>{description}</p>
      
      <div style={uploadAreaStyle}>
        <p style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>
          Drag and drop your {type === 'pcc' ? 'PCC' : 'Bank'} files here
        </p>
        <p style={{ color: '#6b7280', marginBottom: '6px', fontSize: '13px' }}>or</p>
        <label style={{...buttonStyle, padding: '6px 16px', fontSize: '14px'}}>
          Browse Files
          <input
            type="file"
            multiple
            accept={accept}
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files, type)}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <h4 style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>Uploaded:</h4>
          {files.map((file, index) => (
            <div key={index} style={{...fileItemStyle, padding: '8px'}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>📄</span>
                <span style={{ fontWeight: '500', fontSize: '13px' }}>{file.name}</span>
                <span style={{ color: '#6b7280', fontSize: '11px' }}>
                  ({(file.size / 1024).toFixed(0)}KB)
                </span>
              </div>
              <button
                onClick={() => removeFile(index, type)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#6b7280', 
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
        📁 Step 1: Upload Your Files
      </h2>
      
      {renderFileUpload(
        'PCC Cash Receipt Journal Files',
        'Upload your PCC Cash Receipt Journal CSV files. You can upload multiple months/files at once.',
        pccFiles,
        'pcc',
        '.csv'
      )}
      
      {renderFileUpload(
        'Bank Statement Files', 
        'Upload your bank transaction detail reports. Supports Excel (.xlsx, .xls) and CSV files.',
        bankFiles,
        'bank',
        '.xlsx,.xls,.csv'
      )}

      <button
        onClick={processPccFiles}
        disabled={pccFiles.length === 0 || loading}
        style={pccFiles.length === 0 || loading ? buttonDisabledStyle : buttonStyle}
      >
        {loading ? 'Processing...' : 'Process PCC Files & Continue'}
      </button>
      
      {pccFiles.length === 0 && (
        <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '16px' }}>
          Please upload at least one PCC Cash Receipt Journal file to continue.
        </p>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        ✅ Step 2: Select Bank Statement File to Analyze
      </h2>
      
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#d4f7e5', 
        border: '1px solid #a7f3d0', 
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <p style={{ fontWeight: '600' }}>✓ PCC Data Processed Successfully</p>
        <p style={{ color: '#065f46', fontSize: '14px' }}>
          {pccData.length} transactions loaded | Banks found: {pccBanks.join(', ')}
        </p>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        Select a Bank Statement File to Analyze:
      </h3>
      
      {bankFiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>No bank statement files uploaded yet.</p>
          <button onClick={() => setStep(1)} style={buttonStyle}>
            Go Back to Upload Files
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {bankFiles.map((file, index) => (
            <button
              key={index}
              onClick={() => analyzeBankFile(file)}
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: 'white',
                color: '#374151',
                border: '2px solid #d1d5db',
                justifyContent: 'space-between',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '600' }}>{file.name}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <span>→</span>
            </button>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '24px' }}>
        <button onClick={() => setStep(1)} style={{
          ...buttonStyle,
          backgroundColor: 'white',
          color: '#374151',
          border: '2px solid #d1d5db'
        }}>
          ← Back to Upload
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        🔍 Step 3: Column Mapping
      </h2>
      
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f9fafb', 
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
          Analyzing: {selectedBankFile?.name}
        </h3>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Found {bankData.length} transactions with {bankColumns.length} columns
        </p>
      </div>

      {!showCustomMapping ? (
        // Template selection view (default)
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Select a Template
          </h3>
          {savedTemplates.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              {savedTemplates.map(template => (
                <div key={template.id} style={templateCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                      {template.name}
                    </h4>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#dc2626', 
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#6b7280', fontSize: '14px' }}>BANK ID:</span>
                      <div style={{ fontSize: '16px' }}>{template.mapping.bankIdentifier || 'Not set'}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: '600', color: '#6b7280', fontSize: '14px' }}>AMOUNT:</span>
                      <div style={{ fontSize: '16px' }}>{template.mapping.amount || 'Not set'}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: '600', color: '#6b7280', fontSize: '14px' }}>DATE:</span>
                      <div style={{ fontSize: '16px' }}>{template.mapping.date || 'Not set'}</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => loadTemplate(template)}
                    style={{...buttonStyle, width: '100%'}}
                  >
                    Use This Template
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Templates Found</h3>
              <p style={{ color: '#6b7280' }}>Create your first template to save time on future reconciliations.</p>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => setStep(2)} style={{
              ...buttonStyle,
              backgroundColor: 'white',
              color: '#374151',
              border: '2px solid #d1d5db'
            }}>
              Back
            </button>
            <button 
              onClick={() => setShowCustomMapping(true)}
              style={{
                ...buttonStyle,
                backgroundColor: 'white',
                color: '#374151',
                border: '2px solid #d1d5db',
                flex: 1,
                padding: '16px 24px',
                fontSize: '16px'
              }}
            >
              + Create New Mapping
            </button>
          </div>
        </div>
      ) : (
        // Custom mapping view
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
              Column Mapping
            </h3>
            <button 
              onClick={() => setShowCustomMapping(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              ← Back to Templates
            </button>
          </div>

          <div style={{ display: 'grid', gap: '24px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
                Which column identifies the bank/account? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select 
                value={bankColumnMappings.bankIdentifier}
                onChange={(e) => handleColumnMapping('bankIdentifier', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Select Column --</option>
                {bankColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
                Which column contains the transaction amounts? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select 
                value={bankColumnMappings.amount}
                onChange={(e) => handleColumnMapping('amount', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Select Column --</option>
                {bankColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
                Which column contains the transaction dates? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select 
                value={bankColumnMappings.date}
                onChange={(e) => handleColumnMapping('date', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Select Column --</option>
                {bankColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
                Description Column (Optional):
              </label>
              <select 
                value={bankColumnMappings.description}
                onChange={(e) => handleColumnMapping('description', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Select Column --</option>
                {bankColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Save Template Section */}
          <div style={{ 
            padding: '24px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '8px', 
            marginBottom: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              💾 Save as Template
            </h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Template name (e.g., 'Bankwell Bank Template')"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <button 
                onClick={saveTemplate}
                disabled={!bankColumnMappings.bankIdentifier || !bankColumnMappings.amount || !bankColumnMappings.date || !templateName.trim()}
                style={(!bankColumnMappings.bankIdentifier || !bankColumnMappings.amount || !bankColumnMappings.date || !templateName.trim()) ? buttonDisabledStyle : buttonStyle}
              >
                Save Template
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => setStep(2)} style={{
              ...buttonStyle,
              backgroundColor: 'white',
              color: '#374151',
              border: '2px solid #d1d5db'
            }}>
              Back
            </button>
            <button
              onClick={proceedToMapping}
              disabled={!bankColumnMappings.bankIdentifier || !bankColumnMappings.amount || !bankColumnMappings.date}
              style={!bankColumnMappings.bankIdentifier || !bankColumnMappings.amount || !bankColumnMappings.date ? buttonDisabledStyle : buttonStyle}
            >
              Proceed to Bank Mapping
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => {
    const uniqueBankIds = [...new Set(bankData.map(row => row[bankColumnMappings.bankIdentifier]).filter(id => id))];
    
    return (
      <div style={cardStyle}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
          💰 Step 4: Bank Mapping & Selection
        </h2>

        <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Map PCC Banks to Bank Statement IDs
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
            Connect each PCC bank account to its corresponding identifier in your bank statement, then select which one to reconcile.
          </p>
          
          {pccBanks.map(pccBank => {
            const pccTxnCount = pccData.filter(row => row['Bank Account Description'] === pccBank).length;
            const mappedBankId = bankMapping[pccBank];
            const bankTxnCount = mappedBankId ? bankData.filter(row => row[bankColumnMappings.bankIdentifier] === mappedBankId).length : 0;
            const isSelected = selectedPccBank === pccBank;
            
            return (
              <div key={pccBank} style={{
                border: isSelected ? '2px solid #111827' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: isSelected ? '#f9fafb' : 'white',
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '16px', alignItems: 'center' }}>
                  {/* PCC Bank Info */}
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{pccBank}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {pccTxnCount} PCC transactions
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '18px' }}>→</div>
                  
                  {/* Bank ID Selector */}
                  <div>
                    <select
                      value={mappedBankId || ''}
                      onChange={(e) => handleBankMapping(pccBank, e.target.value)}
                      style={{
                        ...selectStyle,
                        fontSize: '14px',
                        padding: '8px 12px'
                      }}
                    >
                      <option value="">-- Select Bank ID --</option>
                      {uniqueBankIds.map(id => (
                        <option key={id} value={id}>
                          {id} ({bankData.filter(row => row[bankColumnMappings.bankIdentifier] === id).length} txns)
                        </option>
                      ))}
                    </select>
                    {mappedBankId && (
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                        {bankTxnCount} bank transactions
                      </div>
                    )}
                  </div>
                  
                  {/* Reconcile Button */}
                  <div style={{ textAlign: 'center' }}>
                    {mappedBankId ? (
                      <button
                        onClick={() => setSelectedPccBank(isSelected ? '' : pccBank)}
                        style={{
                          ...buttonStyle,
                          backgroundColor: isSelected ? '#374151' : '#111827',
                          padding: '8px 16px',
                          fontSize: '14px',
                          width: '100%'
                        }}
                      >
                        {isSelected ? 'Selected ✓' : 'Select to Reconcile'}
                      </button>
                    ) : (
                      <div style={{ 
                        padding: '8px 16px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#6b7280',
                        textAlign: 'center'
                      }}>
                        Map first
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Selected bank details */}
                {isSelected && (
                  <div style={{ 
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#e0f2fe',
                    borderRadius: '8px',
                    border: '1px solid #b3e5fc'
                  }}>
                    <div style={{ fontWeight: '600', color: '#0277bd', marginBottom: '4px' }}>
                      Ready to Reconcile
                    </div>
                    <div style={{ fontSize: '14px', color: '#0277bd' }}>
                      {pccBank} ↔ {mappedBankId} | Comparing {pccTxnCount} PCC vs {bankTxnCount} bank transactions
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => setStep(3)} style={{
            ...buttonStyle,
            backgroundColor: 'white',
            color: '#374151',
            border: '2px solid #d1d5db'
          }}>
            Back
          </button>
          <button
            onClick={performReconciliation}
            disabled={!selectedPccBank}
            style={!selectedPccBank ? buttonDisabledStyle : buttonStyle}
          >
            Perform Reconciliation
          </button>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    if (!reconciliationResults) return null;

    const isMatched = Math.abs(reconciliationResults.difference) < 0.01;
    
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold' }}>Reconciliation Results</h2>
          <button
            onClick={exportToExcel}
            style={{...buttonStyle, backgroundColor: '#374151'}}
          >
            📊 Export to Excel
          </button>
        </div>

        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
          {isMatched ? '✅' : '❌'} Reconciliation Summary
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div 
            onClick={() => {/* PCC Total - no action */}}
            style={{
              padding: '20px',
              backgroundColor: '#f0f9ff',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid #0ea5e9'
            }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#0369a1' }}>
              ${reconciliationResults.pccTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#0369a1', fontWeight: '600', fontSize: '14px' }}>PCC Total</div>
          </div>
          
          <div 
            onClick={() => {/* Bank Total - no action */}}
            style={{
              padding: '20px',
              backgroundColor: '#f0f9ff',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid #0ea5e9'
            }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#0369a1' }}>
              ${reconciliationResults.bankTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#0369a1', fontWeight: '600', fontSize: '14px' }}>Bank Total</div>
          </div>
          
          <div 
            onClick={() => {/* Difference - no action */}}
            style={{
              padding: '20px',
              backgroundColor: isMatched ? '#f0fdf4' : '#fef2f2',
              borderRadius: '12px',
              textAlign: 'center',
              border: `2px solid ${isMatched ? '#22c55e' : '#ef4444'}`
            }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: isMatched ? '#15803d' : '#dc2626' }}>
              ${Math.abs(reconciliationResults.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ color: isMatched ? '#15803d' : '#dc2626', fontWeight: '600', fontSize: '14px' }}>
              {isMatched ? 'Perfect Match' : 'Difference'}
            </div>
          </div>
          
          <div 
            onClick={() => setShowMatches(!showMatches)}
            style={{
              padding: '20px',
              backgroundColor: showMatches ? '#dcfce7' : '#f0fdf4',
              borderRadius: '12px',
              textAlign: 'center',
              border: `2px solid ${showMatches ? '#16a34a' : '#22c55e'}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#15803d' }}>
              {reconciliationResults.matches.length}
            </div>
            <div style={{ color: '#15803d', fontWeight: '600', fontSize: '14px' }}>
              Matches {showMatches ? '▼' : '▶'}
            </div>
          </div>
          
          <div 
            onClick={() => setShowPccUnmatched(!showPccUnmatched)}
            style={{
              padding: '20px',
              backgroundColor: showPccUnmatched ? '#fef3c7' : '#fefbf2',
              borderRadius: '12px',
              textAlign: 'center',
              border: `2px solid ${showPccUnmatched ? '#d97706' : '#f59e0b'}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#d97706' }}>
              {reconciliationResults.unmatchedPcc.length}
            </div>
            <div style={{ color: '#d97706', fontWeight: '600', fontSize: '14px' }}>
              PCC Unmatched {showPccUnmatched ? '▼' : '▶'}
            </div>
          </div>
          
          <div 
            onClick={() => setShowBankUnmatched(!showBankUnmatched)}
            style={{
              padding: '20px',
              backgroundColor: showBankUnmatched ? '#fef3c7' : '#fefbf2',
              borderRadius: '12px',
              textAlign: 'center',
              border: `2px solid ${showBankUnmatched ? '#d97706' : '#f59e0b'}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#d97706' }}>
              {reconciliationResults.unmatchedBank.length}
            </div>
            <div style={{ color: '#d97706', fontWeight: '600', fontSize: '14px' }}>
              Bank Unmatched {showBankUnmatched ? '▼' : '▶'}
            </div>
          </div>
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          padding: '24px', 
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
            {isMatched 
              ? '✓ PCC Cash Receipt Journal and Bank Transactions Match' 
              : '⚠ Discrepancies Found Between PCC and Bank Records'
            }
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            Click the boxes above to view detailed breakdowns
          </p>
        </div>

        {showMatches && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '20px', fontWeight: '600' }}>
                ✓ Successful Matches ({reconciliationResults.matches.length})
              </h4>
              {reconciliationResults.matches.length > 3 && (
                <button
                  onClick={() => setExpandedMatches(!expandedMatches)}
                  style={{
                    background: 'none',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                >
                  {expandedMatches ? 'Show Less' : `Show All ${reconciliationResults.matches.length}`}
                </button>
              )}
            </div>
            
            {(expandedMatches ? reconciliationResults.matches : reconciliationResults.matches.slice(0, 3)).map((match, index) => (
              <div key={index} style={{
                padding: '16px',
                backgroundColor: '#d4f7e5',
                borderRadius: '8px',
                borderLeft: '4px solid #22c55e',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>PCC Batch #{match.pccBatch.batchNumber}</div>
                    <div style={{ fontSize: '14px', color: '#065f46' }}>{match.pccBatch.description}</div>
                    <div style={{ fontSize: '12px', color: '#065f46' }}>Date: {match.pccBatch.postingDate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      ${match.pccBatch.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '600' }}>✓ Perfect Match</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showPccUnmatched && reconciliationResults.unmatchedPcc.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '20px', fontWeight: '600' }}>
                ❌ PCC Batches Without Bank Matches ({reconciliationResults.unmatchedPcc.length})
              </h4>
              {reconciliationResults.unmatchedPcc.length > 3 && (
                <button
                  onClick={() => setExpandedPccUnmatched(!expandedPccUnmatched)}
                  style={{
                    background: 'none',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                >
                  {expandedPccUnmatched ? 'Show Less' : `Show All ${reconciliationResults.unmatchedPcc.length}`}
                </button>
              )}
            </div>
            
            {(expandedPccUnmatched ? reconciliationResults.unmatchedPcc : reconciliationResults.unmatchedPcc.slice(0, 3)).map((batch, index) => (
              <div key={index} style={{
                padding: '16px',
                backgroundColor: '#fecaca',
                borderRadius: '8px',
                borderLeft: '4px solid #ef4444',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>PCC Batch #{batch.batchNumber}</div>
                    <div style={{ fontSize: '14px', color: '#7f1d1d' }}>{batch.description}</div>
                    <div style={{ fontSize: '12px', color: '#7f1d1d' }}>Date: {batch.postingDate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      ${batch.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '14px', color: '#b91c1c', fontWeight: '600' }}>Missing from Bank</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showBankUnmatched && reconciliationResults.unmatchedBank.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '20px', fontWeight: '600' }}>
                ⚠️ Bank Transactions Without PCC Matches ({reconciliationResults.unmatchedBank.length})
              </h4>
              {reconciliationResults.unmatchedBank.length > 3 && (
                <button
                  onClick={() => setExpandedBankUnmatched(!expandedBankUnmatched)}
                  style={{
                    background: 'none',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                >
                  {expandedBankUnmatched ? 'Show Less' : `Show All ${reconciliationResults.unmatchedBank.length}`}
                </button>
              )}
            </div>
            
            {(expandedBankUnmatched ? reconciliationResults.unmatchedBank : reconciliationResults.unmatchedBank.slice(0, 3)).map((txn, index) => (
              <div key={index} style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                borderLeft: '4px solid #f59e0b',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>Bank ID: {txn[bankColumnMappings.bankIdentifier]}</div>
                    <div style={{ fontSize: '14px', color: '#92400e' }}>{txn[bankColumnMappings.description] || 'No description'}</div>
                    <div style={{ fontSize: '12px', color: '#92400e' }}>Date: {txn[bankColumnMappings.date]}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      ${parseFloat(txn[bankColumnMappings.amount]).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '14px', color: '#d97706', fontWeight: '600' }}>Extra in Bank</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Final Summary</h4>
          <div style={{ display: 'grid', gap: '12px', color: '#374151' }}>
            <p>
              <span style={{ fontWeight: '600' }}>Reconciling:</span> {reconciliationResults.selectedPccBank} → {reconciliationResults.mappedBankId}
            </p>
            <p>
              <span style={{ fontWeight: '600' }}>Perfect Matches:</span> {reconciliationResults.matches.length} transactions
            </p>
            {reconciliationResults.unmatchedPcc.length > 0 && (
              <p>
                <span style={{ fontWeight: '600' }}>Missing from Bank:</span> {reconciliationResults.unmatchedPcc.length} PCC batches
              </p>
            )}
            {reconciliationResults.unmatchedBank.length > 0 && (
              <p>
                <span style={{ fontWeight: '600' }}>Extra in Bank:</span> {reconciliationResults.unmatchedBank.length} bank transactions
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => setStep(4)} style={{
            ...buttonStyle,
            backgroundColor: 'white',
            color: '#374151',
            border: '2px solid #d1d5db'
          }}>
            Back to Bank Selection
          </button>
          <button
            onClick={() => {
              setReconciliationResults(null);
              setSelectedPccBank('');
              setStep(4);
            }}
            style={{...buttonStyle, backgroundColor: '#374151'}}
          >
            Reconcile Another Bank
          </button>
          <button
            onClick={() => {
              // Clear all data and start over
              setPccFiles([]);
              setBankFiles([]);
              setPccData([]);
              setBankData([]);
              setBankColumns([]);
              setBankColumnMappings({
                bankIdentifier: '',
                amount: '',
                date: '',
                description: ''
              });
              setPccBanks([]);
              setBankMapping({});
              setSelectedBankFile(null);
              setSelectedPccBank('');
              setReconciliationResults(null);
              setShowCustomMapping(false);
              setShowMatches(false);
              setShowPccUnmatched(false);
              setShowBankUnmatched(false);
              setStep(1);
            }}
            style={{
              ...buttonStyle,
              backgroundColor: 'white',
              color: '#374151',
              border: '2px solid #d1d5db'
            }}
          >
            Clear & Start Over
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>PCC Bank Reconciliation Tool</div>
      <p style={subtitleStyle}>
        Professional reconciliation tool that adapts to any bank statement format
      </p>
      
      <div style={progressStyle}>
        {[1, 2, 3, 4, 5].map(num => (
          <React.Fragment key={num}>
            <div style={step >= num ? activeStepStyle : inactiveStepStyle}>
              {num}
            </div>
            {num < 5 && (
              <div style={{
                width: '32px',
                height: '2px',
                backgroundColor: step > num ? '#111827' : '#d1d5db'
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
    </div>
  );
}

export default App;