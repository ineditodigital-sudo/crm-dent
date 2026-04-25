

export const Logo = ({ size = 'normal', className = '' }: { size?: 'small' | 'normal' | 'large', className?: string }) => {
  const dimensions = {
    small: { blob: 32, font: '1rem', blobText: '0.8rem' },
    normal: { blob: 40, font: '1.2rem', blobText: '0.9rem' },
    large: { blob: 56, font: '1.75rem', blobText: '1.25rem' }
  };
  
  const current = dimensions[size];

  return (
    <div className={`native-logo-wrapper ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div 
        className="native-logo-blob"
        style={{
          width: current.blob,
          height: current.blob,
          background: 'var(--primary)',
          borderRadius: size === 'large' ? '18px' : '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: current.blobText,
          fontWeight: 800,
          boxShadow: '0 8px 16px var(--primary-light)'
        }}
      >
        SO
      </div>
      <span style={{ 
        fontWeight: 800, 
        fontSize: current.font,
        color: 'var(--text-primary)',
        letterSpacing: '-0.5px'
      }}>
        Stephanie <span style={{ color: 'var(--primary)' }}>O.</span>
      </span>
    </div>
  );
};
