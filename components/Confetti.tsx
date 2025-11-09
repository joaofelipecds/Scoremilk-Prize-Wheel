
import React from 'react';

const ConfettiPiece: React.FC<{ id: number }> = ({ id }) => {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const style: React.CSSProperties = {
        position: 'fixed',
        width: `${Math.random() * 8 + 6}px`,
        height: `${Math.random() * 8 + 6}px`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        top: `${Math.random() * -20}%`,
        left: `${Math.random() * 100}%`,
        opacity: 1,
        transform: `rotate(${Math.random() * 360}deg)`,
        animation: `fall ${Math.random() * 2 + 3}s ${Math.random() * 2}s linear forwards`,
    };

    return <div style={style} />;
};

const Confetti: React.FC = () => {
    const confettiCount = 150;

    const keyframes = `
        @keyframes fall {
            to {
                transform: translateY(100vh) rotate(${Math.random() * 360}deg);
                opacity: 0;
            }
        }
    `;

    return (
        <>
            <style>{keyframes}</style>
            <div className="pointer-events-none fixed top-0 left-0 w-full h-full overflow-hidden z-50">
                {Array.from({ length: confettiCount }).map((_, index) => (
                    <ConfettiPiece key={index} id={index} />
                ))}
            </div>
        </>
    );
};

export default React.memo(Confetti);
