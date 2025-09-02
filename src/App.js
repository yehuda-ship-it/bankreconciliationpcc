import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const cardStyle = {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    border: '1px solid #e5e7eb',
    maxWidth: '1200px',
    margin: '0 auto 24px auto'
  };

  const titleStyle = {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: '8px'
  };

  const subtitleStyle = {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: '18px',
    marginBottom: '32px'
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
    border: '3px dashed #d1d5db',
    borderRadius: '12px',
    padding: '48px 32px',
    textAlign: 'center',
    backgroundColor: '#fafafa',
    margin: '16px 0',
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
    gap: '16px',
    margin: '32px 0'
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
    
    setStep(5);
  };

  const exportToExcel = () => {
    if (!reconciliationResults) return;

    const wb = XLSX.utils.book_new();

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
      ['Status:', Math.abs(reconciliationResults.difference) < 0.01 ? 'MATCHED' : 'DISCREPANCY']
    ];
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Bank_Reconciliation_${reconciliationResults.selectedPccBank.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Render functions
  const renderFileUpload = (title, description, files, type, accept) => (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: '#6b7280', marginBottom: '16px' }}>{description}</p>
      
      <div style={uploadAreaStyle}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
        <p style={{ fontWeight: '600', marginBottom: '8px' }}>
          Drag and drop your {type === 'pcc' ? 'PCC' : 'Bank'} files here
        </p>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>or</p>
        <label style={buttonStyle}>
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
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Uploaded Files:</h4>
          {files.map((file, index) => (
            <div key={index} style={fileItemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>📄</span>
                <span style={{ fontWeight: '500' }}>{file.name}</span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                onClick={() => removeFile(index, type)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#6b7280', 
                  cursor: 'pointer',
                  fontSize: '18px'
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
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
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
        🔍 Step 3: Identify Bank Statement Columns
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

      <div style={{ display: 'grid', gap: '24px' }}>
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
      </div>

      <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
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
  );

  const renderStep4 = () => {
    const uniqueBankIds = [...new Set(bankData.map(row => row[bankColumnMappings.bankIdentifier]).filter(id => id))];
    
    return (
      <div style={cardStyle}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
          💰 Step 4: Map PCC Banks to Bank Statement Identifiers
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '32px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              PCC Bank Accounts
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {pccBanks.map(bank => (
                <div key={bank} style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  borderLeft: '4px solid #9ca3af'
                }}>
                  <div style={{ fontWeight: '600' }}>{bank}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {pccData.filter(row => row['Bank Account Description'] === bank).length} transactions
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Bank Statement Identifiers
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {uniqueBankIds.map(id => (
                <div key={id} style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  borderLeft: '4px solid #4b5563'
                }}>
                  <div style={{ fontWeight: '600' }}>{id}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {bankData.filter(row => row[bankColumnMappings.bankIdentifier] === id).length} transactions
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Create Mappings</h3>
          {pccBanks.map(pccBank => (
            <div key={pccBank} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600' }}>{pccBank}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>PCC Bank Account</div>
              </div>
              <div style={{ color: '#9ca3af' }}>→</div>
              <div style={{ flex: 1 }}>
                <select
                  value={bankMapping[pccBank] || ''}
                  onChange={(e) => handleBankMapping(pccBank, e.target.value)}
                  style={selectStyle}
                >
                  <option value="">-- Select Bank ID --</option>
                  {uniqueBankIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Select Bank to Reconcile Today
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {pccBanks.filter(bank => bankMapping[bank]).map(bank => (
              <button
                key={bank}
                onClick={() => setSelectedPccBank(bank)}
                style={{
                  width: '100%',
                  padding: '16px',
                  textAlign: 'left',
                  border: selectedPccBank === bank ? '2px solid #6b7280' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: selectedPccBank === bank ? '#f9fafb' : 'white',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: '600' }}>{bank}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Maps to: {bankMapping[bank]} | 
                  PCC Transactions: {pccData.filter(row => row['Bank Account Description'] === bank).length} | 
                  Bank Transactions: {bankData.filter(row => row[bankColumnMappings.bankIdentifier] === bankMapping[bank]).length}
                </div>
              </button>
            ))}
          </div>
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
          {isMatched ? '✅' : '❌'} Summary
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div style={{
            padding: '24px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
              ${reconciliationResults.pccTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#6b7280', fontWeight: '600' }}>PCC Total</div>
          </div>
          <div style={{
            padding: '24px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
              ${reconciliationResults.bankTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#6b7280', fontWeight: '600' }}>Bank Total</div>
          </div>
          <div style={{
            padding: '24px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
              ${Math.abs(reconciliationResults.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#6b7280', fontWeight: '600' }}>
              {isMatched ? 'Perfect Match' : 'Difference'}
            </div>
          </div>
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          padding: '24px', 
          borderTop: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
            {isMatched 
              ? '✓ PCC Cash Receipt Journal and Bank Transactions Match' 
              : '⚠ Discrepancies Found Between PCC and Bank Records'
            }
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            ✓ Successful Matches ({reconciliationResults.matches.length})
          </h4>
          {reconciliationResults.matches.slice(0, 3).map((match, index) => (
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
          {reconciliationResults.matches.length > 3 && (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
              ... and {reconciliationResults.matches.length - 3} more matches
            </p>
          )}
        </div>

        {reconciliationResults.unmatchedPcc.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              ❌ PCC Batches Without Bank Matches ({reconciliationResults.unmatchedPcc.length})
            </h4>
            {reconciliationResults.unmatchedPcc.slice(0, 3).map((batch, index) => (
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
            {reconciliationResults.unmatchedPcc.length > 3 && (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                ... and {reconciliationResults.unmatchedPcc.length - 3} more unmatched PCC batches
              </p>
            )}
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