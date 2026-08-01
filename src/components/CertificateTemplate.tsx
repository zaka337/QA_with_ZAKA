import { forwardRef } from 'react';

interface CertificateTemplateProps {
  studentName: string;
  courseName: string;
  date: string;
  registrationNumber: string;
}

const GOLD = '#B08D57';

function DiamondMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" transform="rotate(45 20 20)" stroke="#1a1a1a" strokeWidth="1.5" />
      <rect x="15" y="15" width="10" height="10" rx="1" transform="rotate(45 20 20)" fill="#1a1a1a" />
    </svg>
  );
}

export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ studentName, courseName, date, registrationNumber }, ref) => {
    return (
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div
          ref={ref}
          className="relative w-[1123px] h-[794px] overflow-hidden flex flex-col items-center"
          style={{ background: '#fbf9f5', fontFamily: "'Inter', sans-serif" }}
        >
          {/* Outer + inner border frame */}
          <div style={{ position: 'absolute', inset: 24, border: `2px solid ${GOLD}` }} />
          <div style={{ position: 'absolute', inset: 32, border: '1px solid rgba(176,141,87,0.4)' }} />

          {/* Header */}
          <div className="flex flex-col items-center" style={{ marginTop: 64 }}>
            <DiamondMark size={44} />
            <div
              className="uppercase"
              style={{
                marginTop: 14,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.35em',
                color: '#1a1a1a',
              }}
            >
              QA with Zaka
            </div>
          </div>

          {/* Title */}
          <h1
            className="uppercase"
            style={{
              marginTop: 36,
              fontFamily: "'EB Garamond', serif",
              fontSize: 44,
              letterSpacing: '0.12em',
              color: '#1a1a1a',
              fontWeight: 500,
            }}
          >
            Certificate of Completion
          </h1>

          <div className="flex items-center" style={{ marginTop: 20, gap: 14 }}>
            <div style={{ width: 90, height: 1, background: GOLD }} />
            <div style={{ width: 6, height: 6, background: GOLD, transform: 'rotate(45deg)' }} />
            <div style={{ width: 90, height: 1, background: GOLD }} />
          </div>

          <p
            style={{
              marginTop: 34,
              fontSize: 16,
              color: '#555',
              fontFamily: "'EB Garamond', serif",
              letterSpacing: '0.03em',
            }}
          >
            This certifies that
          </p>

          {/* Student Name */}
          <h2
            style={{
              marginTop: 14,
              fontFamily: "'EB Garamond', serif",
              fontWeight: 600,
              fontSize: 56,
              color: '#1a1a1a',
            }}
          >
            {studentName || 'Awesome Student'}
          </h2>

          <p
            style={{
              marginTop: 20,
              fontSize: 16,
              color: '#555',
              fontFamily: "'EB Garamond', serif",
              letterSpacing: '0.03em',
            }}
          >
            has successfully completed the course requirements for
          </p>

          {/* Course Title */}
          <h3
            className="uppercase text-center"
            style={{
              marginTop: 14,
              maxWidth: 760,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: '0.04em',
              color: '#1a1a1a',
            }}
          >
            {courseName}
          </h3>

          {/* Footer row */}
          <div
            className="flex items-end justify-between"
            style={{ position: 'absolute', bottom: 78, left: 100, right: 100 }}
          >
            {/* Date */}
            <div className="flex flex-col items-center" style={{ width: 220 }}>
              <span style={{ fontSize: 15, color: '#1a1a1a', fontWeight: 600 }}>{date}</span>
              <div style={{ width: 160, height: 1, background: '#1a1a1a', marginTop: 8 }} />
              <span
                className="uppercase"
                style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.2em', color: '#888' }}
              >
                Date Issued
              </span>
            </div>

            {/* Seal — purely decorative, no data, so it can never contradict the real ID below */}
            <div className="flex flex-col items-center" style={{ width: 140 }}>
              <svg width="86" height="86" viewBox="0 0 86 86">
                <circle cx="43" cy="43" r="41" fill="none" stroke={GOLD} strokeWidth="1.5" />
                <circle cx="43" cy="43" r="34" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.5" />
                <g transform="translate(23,23)">
                  <rect x="4" y="4" width="32" height="32" rx="2" transform="rotate(45 20 20)" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
                  <rect x="15" y="15" width="10" height="10" rx="1" transform="rotate(45 20 20)" fill="#1a1a1a" />
                </g>
              </svg>
            </div>

            {/* Signature */}
            <div className="flex flex-col items-center" style={{ width: 220 }}>
              <span
                style={{
                  fontSize: 28,
                  fontFamily: "'EB Garamond', serif",
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: '#1a1a1a',
                }}
              >
                Zaka Satti
              </span>
              <div style={{ width: 160, height: 1, background: '#1a1a1a', marginTop: 4 }} />
              <span
                className="uppercase"
                style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.2em', color: '#888' }}
              >
                Founder, QA with Zaka
              </span>
            </div>
          </div>

          {/* Verification ID */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: "'Fira Code', monospace",
              fontSize: 12,
              letterSpacing: '0.15em',
              color: '#999',
            }}
          >
            CERTIFICATE ID&nbsp;&nbsp;{registrationNumber}
          </div>
        </div>
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';
