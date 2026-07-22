import { forwardRef } from 'react';

interface CertificateTemplateProps {
  studentName: string;
  courseName: string;
  date: string;
  registrationNumber: string;
}

export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ studentName, courseName, date, registrationNumber }, ref) => {
    return (
      <div className="absolute top-[-9999px] left-[-9999px]">
        {/* We assume standard landscape certificate aspect ratio */}
        <div 
          ref={ref}
          className="relative w-[1123px] h-[794px] overflow-hidden"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Background is handled directly by jsPDF to guarantee it renders */}
          
          {/* Dynamic Content Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col items-center">
            
            {/* Student Name */}
            <div className="absolute top-[46%] w-full text-center">
              <h1 className="text-6xl font-bold italic text-black/90 tracking-wide" style={{ fontFamily: "'EB Garamond', serif" }}>
                {studentName || "Awesome Student"}
              </h1>
            </div>

            {/* Course Title */}
            <div className="absolute top-[65%] w-full text-center px-24">
              <h2 className="text-3xl font-black text-black/80 uppercase tracking-tighter drop-shadow-sm">
                {courseName}
              </h2>
            </div>

            {/* Date */}
            <div className="absolute bottom-[23%] left-[10%] w-[250px] text-center">
              <p className="text-xl font-bold text-black/80 tracking-wider">{date}</p>
            </div>

            {/* Registration Number */}
            <div className="absolute bottom-[10%] right-[12%] w-[300px] text-center">
              <p className="text-lg font-bold text-black/80 tracking-widest font-mono">{registrationNumber}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';
