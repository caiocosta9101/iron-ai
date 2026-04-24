import ReactMarkdown from 'react-markdown';

interface ReportProps {
  content: string;
}

export function ReportRenderer({ content }: ReportProps) {
  
  // FUNÇÃO PARA CONVERTER TABELAS DE TEXTO EM HTML REAL
  const parseTables = (text: string) => {
    const lines = text.split('\n');
    let inTable = false;
    let htmlResult = [];
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        // Ignora a linha de separação |---|---|
        if (line.includes('---')) continue;

        const cells = line.split('|').filter(c => c.trim() !== '' || line.indexOf('|' + c + '|') !== -1);
        const isHeader = tableRows.length === 0;
        
        const row = (
          <tr key={i} className={isHeader ? "bg-[#112218] border-b-2 border-purple-500/50" : "border-b border-[#326747]/30 hover:bg-[#152b1f] transition-colors"}>
            {cells.map((cell, idx) => (
              isHeader ? 
                <th key={idx} className="px-4 py-3 text-purple-400 font-bold uppercase text-xs tracking-wider text-left">{cell.trim()}</th> :
                <td key={idx} className="px-4 py-3 text-gray-200 text-sm">{cell.trim()}</td>
            ))}
          </tr>
        );
        tableRows.push(row);
      } else {
        if (inTable) {
          htmlResult.push(
            <div key={`table-${i}`} className="my-6 overflow-x-auto rounded-xl border border-[#326747] shadow-lg">
              <table className="w-full border-collapse">{tableRows}</table>
            </div>
          );
          tableRows = [];
          inTable = false;
        }
        htmlResult.push(<ReactMarkdown key={i} components={{
            h4: ({node, ...props}) => <h4 className="text-lg text-purple-300 font-bold mt-8 mb-2 uppercase" {...props} />,
            p: ({node, ...props}) => <p className="text-[#92c9a8] mb-4 leading-relaxed" {...props} />,
            strong: ({node, ...props}) => <strong className="text-purple-400 font-bold" {...props} />
        }}>{line}</ReactMarkdown>);
      }
    }
    
    // Caso o texto termine com uma tabela
    if (inTable) {
        htmlResult.push(
            <div key="table-end" className="my-6 overflow-x-auto rounded-xl border border-[#326747] shadow-lg">
              <table className="w-full border-collapse">{tableRows}</table>
            </div>
        );
    }

    return htmlResult;
  };

  return (
    <div className="bg-[#193324] border border-[#326747] rounded-3xl p-6 lg:p-10 shadow-2xl relative">
      {parseTables(content)}
    </div>
  );
}