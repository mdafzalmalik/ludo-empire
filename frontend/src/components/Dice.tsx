'use client';

import { motion } from 'framer-motion';

interface DiceProps {
  value?: number;
  onRoll?: (value: number) => void;
  disabled?: boolean;
  isRolling?: boolean;
  size?: number;
}

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export default function Dice({ value = 6, onRoll, disabled, isRolling, size = 44 }: DiceProps) {
  const dotSize = size * 0.16;
  const padding = size * 0.15;
  const cellSize = (size - padding * 2) / 3;

  // Final rotations for each face to face the camera
  const finalRotations: Record<number, { rotateX: number, rotateY: number }> = {
    1: { rotateX: 0, rotateY: 0 },
    6: { rotateX: 0, rotateY: -180 },
    2: { rotateX: 0, rotateY: -90 },
    5: { rotateX: 0, rotateY: 90 },
    3: { rotateX: -90, rotateY: 0 },
    4: { rotateX: 90, rotateY: 0 },
  };

  const targetRotation = finalRotations[value] || finalRotations[1];

  const rollAnimation = isRolling ? {
    rotateX: [targetRotation.rotateX - 720, targetRotation.rotateX - 360, targetRotation.rotateX],
    rotateY: [targetRotation.rotateY - 720, targetRotation.rotateY - 360, targetRotation.rotateY],
    y: [0, -40, -10, -20, 0],
    scale: [1, 1.2, 0.9, 1.1, 1],
  } : {
    rotateX: targetRotation.rotateX,
    rotateY: targetRotation.rotateY,
    y: 0,
    scale: 1
  };

  const renderFace = (faceValue: number, transform: string) => {
    const dots = DOT_POSITIONS[faceValue];
    return (
      <div
        className="absolute inset-0 rounded-xl bg-white flex items-center justify-center overflow-hidden"
        style={{
          transform,
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0c0c0 100%)',
          border: '1px solid #dca3a3',
          boxShadow: 'inset 0 0 10px rgba(255, 100, 100, 0.2)',
        }}
      >
        <div className="absolute inset-0" style={{ padding }}>
          <div className="relative w-full h-full">
            {dots.map(([row, col], i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: dotSize,
                  height: dotSize,
                  backgroundColor: '#111',
                  boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.3), 0px 1px 1px rgba(0,0,0,0.6)',
                  left: col * cellSize + (cellSize - dotSize) / 2,
                  top: row * cellSize + (cellSize - dotSize) / 2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative cursor-pointer select-none focus:outline-none"
      style={{ width: size, height: size, perspective: '600px' }}
      onClick={() => !disabled && !isRolling && onRoll?.(Math.floor(Math.random() * 6) + 1)}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        whileHover={!disabled && !isRolling ? { scale: 1.1 } : {}}
        whileTap={!disabled && !isRolling ? { scale: 0.9 } : {}}
        animate={rollAnimation}
        transition={isRolling ? { duration: 0.8, ease: 'easeOut' } : { type: 'spring', stiffness: 300, damping: 20 }}
      >
        {renderFace(1, `translateZ(${size / 2}px)`)}
        {renderFace(6, `rotateY(180deg) translateZ(${size / 2}px)`)}
        {renderFace(2, `rotateY(90deg) translateZ(${size / 2}px)`)}
        {renderFace(5, `rotateY(-90deg) translateZ(${size / 2}px)`)}
        {renderFace(3, `rotateX(90deg) translateZ(${size / 2}px)`)}
        {renderFace(4, `rotateX(-90deg) translateZ(${size / 2}px)`)}
      </motion.div>
    </div>
  );
}
