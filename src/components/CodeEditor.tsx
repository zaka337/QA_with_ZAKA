import { useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  initialValue?: string;
  language?: string;
  onChange?: (value: string) => void;
  onRun?: (value: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({ initialValue = '', language = 'javascript', onChange, onRun, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Define a custom theme that matches our dark mode aesthetic
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { background: '050505' },
      ],
      colors: {
        'editor.background': '#050505',
        'editor.lineHighlightBackground': '#111111',
        'editorLineNumber.foreground': '#444444',
        'editorIndentGuide.background': '#222222',
        'editorSuggestWidget.background': '#111111',
        'editorSuggestWidget.border': '#333333',
      }
    });
    monaco.editor.setTheme('custom-dark');
  };

  return (
    <div className="w-full h-full border border-white/10 rounded-lg overflow-hidden bg-[#050505]">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <span className="ml-2 text-xs font-inter font-light text-white/40 tracking-wider">
            main.{language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'txt'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="px-3 py-1 text-xs font-inter font-medium text-white/70 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
            onClick={() => {
              if (editorRef.current) {
                if (onRun) {
                  onRun(editorRef.current.getValue());
                } else {
                  alert('Code execution sandbox is not yet implemented!');
                }
              }
            }}
          >
            Run Code
          </button>
        </div>
      </div>
      
      {/* Monaco Editor */}
      <Editor
        height="calc(100% - 41px)" // Subtract header height
        defaultLanguage={language}
        value={initialValue}
        theme="vs-dark" // Fallback until onMount theme loads
        onMount={handleEditorDidMount}
        onChange={(val) => onChange && onChange(val || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 24,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          readOnly: readOnly,
          wordWrap: 'on'
        }}
      />
    </div>
  );
}
