import { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';

interface ScreenKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
}

const ROWS_LOWER = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACK'],
  ['123', 'SPACE', '.', 'ENTER'],
];

const ROWS_UPPER = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
  ['123', 'SPACE', '.', 'ENTER'],
];

const ROWS_NUMBERS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
  ['ABC', '.', ',', '?', '!', "'", 'BACK'],
  ['SPACE', 'ENTER'],
];

export default function ScreenKeyboard({ value, onChange, maxLength = 200, placeholder, label, multiline }: ScreenKeyboardProps) {
  const { tenant } = useTenant();
  const [shift, setShift] = useState(false);
  const [numbers, setNumbers] = useState(false);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';

  const rows = numbers ? ROWS_NUMBERS : shift ? ROWS_UPPER : ROWS_LOWER;

  function handlePress(key: string) {
    switch (key) {
      case 'SHIFT':
        setShift(!shift);
        break;
      case 'BACK':
        onChange(value.slice(0, -1));
        break;
      case 'SPACE':
        if (value.length < maxLength) onChange(value + ' ');
        break;
      case 'ENTER':
        if (multiline && value.length < maxLength) onChange(value + '\n');
        break;
      case '123':
        setNumbers(true);
        break;
      case 'ABC':
        setNumbers(false);
        break;
      default:
        if (value.length < maxLength) {
          onChange(value + key);
          if (shift) setShift(false);
        }
    }
  }

  function getKeyWidth(key: string): string {
    if (key === 'SPACE') return '50%';
    if (key === 'SHIFT' || key === 'BACK') return 'auto';
    if (key === 'ENTER') return 'auto';
    if (key === '123' || key === 'ABC') return 'auto';
    return 'auto';
  }

  function getKeyLabel(key: string): string | React.ReactNode {
    if (key === 'SHIFT') return shift ? '⬆' : '⇧';
    if (key === 'SPACE') return '               ';
    if (key === 'ENTER') return '↵';
    if (key === 'BACK') return '⌫';
    return key;
  }

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
          padding: '14px 18px',
          borderRadius: '14px',
          border: `1px solid ${primary}30`,
          backgroundColor: `${bg}CC`,
          marginBottom: '12px',
          minHeight: multiline ? '70px' : 'auto',
        }}
      >
        <span style={{ color: value ? text : `${text}40`, fontSize: '16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {value || placeholder || ''}
        </span>
        <span style={{ color: primary, animation: 'blink 1s infinite', fontSize: '16px' }}>|</span>
      </div>

      {/* Keyboard */}
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            {row.map((key) => {
              const isSpecial = ['SHIFT', 'BACK', 'SPACE', 'ENTER', '123', 'ABC'].includes(key);
              return (
                <button
                  key={key}
                  onClick={() => handlePress(key)}
                  style={{
                    padding: key === 'SPACE' ? '14px 0' : '14px 0',
                    width: getKeyWidth(key),
                    minWidth: key === 'SPACE' ? '200px' : isSpecial ? '56px' : '42px',
                    flex: key === 'SPACE' ? 1 : undefined,
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: isSpecial ? '16px' : '20px',
                    fontWeight: isSpecial ? '600' : '500',
                    color: isSpecial ? primary : text,
                    background: isSpecial ? `${primary}20` : `${primary}10`,
                    transition: 'all 0.1s ease',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = 'scale(0.93)';
                    e.currentTarget.style.background = `${primary}35`;
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = isSpecial ? `${primary}20` : `${primary}10`;
                  }}
                >
                  {getKeyLabel(key)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
