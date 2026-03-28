import { useTenant } from '../contexts/TenantContext';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  label?: string;
}

export default function NumericKeypad({ value, onChange, maxLength = 4, placeholder = '00', label }: NumericKeypadProps) {
  const { tenant } = useTenant();
  const primary = tenant?.cor_primaria || '#3B82F6';
  const secondary = tenant?.cor_secundaria || '#1E40AF';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  function handlePress(key: string) {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === 'clear') {
      onChange('');
    } else {
      if (value.length < maxLength) {
        onChange(value + key);
      }
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'];

  return (
    <div>
      {label && (
        <label style={{ display: 'block', color: text, fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
          {label}
        </label>
      )}

      {/* Display */}
      <div
        style={{
          padding: '20px',
          borderRadius: '16px',
          border: `1px solid ${primary}30`,
          backgroundColor: `${bg}CC`,
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            color: value ? accent : `${text}30`,
            fontSize: '48px',
            fontWeight: 'bold',
            letterSpacing: '12px',
            fontFamily: 'monospace',
          }}
        >
          {value || placeholder}
        </span>
      </div>

      {/* Keypad */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          maxWidth: '360px',
          margin: '0 auto',
        }}
      >
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => handlePress(key)}
            style={{
              padding: '20px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              fontSize: key === 'clear' || key === 'backspace' ? '14px' : '28px',
              fontWeight: 'bold',
              color: key === 'clear' ? '#EF4444' : text,
              background: key === 'clear'
                ? 'rgba(239, 68, 68, 0.1)'
                : key === 'backspace'
                  ? `${primary}15`
                  : `${primary}12`,
              transition: 'all 0.15s ease',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
              e.currentTarget.style.background = key === 'clear'
                ? 'rgba(239, 68, 68, 0.2)'
                : `${primary}30`;
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = key === 'clear'
                ? 'rgba(239, 68, 68, 0.1)'
                : key === 'backspace'
                  ? `${primary}15`
                  : `${primary}12`;
            }}
          >
            {key === 'backspace' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '28px', height: '28px', margin: '0 auto' }}>
                <path fillRule="evenodd" d="M2.515 10.674a1.875 1.875 0 0 0 0 2.652L8.89 19.7c.352.351.829.549 1.326.549H19.5a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-9.284c-.497 0-.974.198-1.326.55l-6.375 6.374ZM12.53 9.22a.75.75 0 1 0-1.06 1.06L13.19 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L15.31 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" clipRule="evenodd" />
              </svg>
            ) : key === 'clear' ? (
              'Limpar'
            ) : (
              key
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
