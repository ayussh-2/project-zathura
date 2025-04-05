'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, X, Lightbulb } from 'lucide-react';
import { Wifi, Bluetooth } from 'lucide-react';
import './HectocGame.css';

type Operation = '+' | '-' | '*' | '/' | '' | '(' | ')';
type CellType = 'digit' | 'operation';

interface Cell {
  type: CellType;
  value: string;
  id: string;
  draggable?: boolean;
}

const HectocGame: React.FC = () => {
  const [cells, setCells] = useState<Cell[]>([]);
  const [draggedItem, setDraggedItem] = useState<Cell | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('Drag operations between digits to make 100');
  const operationsPanelRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<Cell[][]>([]);
  const [timeLeft, setTimeLeft] = useState(59);
  const [touchDragging, setTouchDragging] = useState(false);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  const [touchSourceIndex, setTouchSourceIndex] = useState<number>(-1);
  const [touchSourceCell, setTouchSourceCell] = useState<Cell | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize the game board
  useEffect(() => {
    const initialDigits = ['1', '2', '3', '4', '5', '6'];
    const initialCells: Cell[] = [];

    initialDigits.forEach((digit, index) => {
      initialCells.push({
        type: 'digit',
        value: digit,
        id: `digit-${index}`,
        draggable: false,
      });

      if (index < initialDigits.length - 1) {
        initialCells.push({
          type: 'operation',
          value: '',
          id: `op-${index}`,
          draggable: true,
        });
      }
    });

    setCells(initialCells);
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, cell: Cell, index: number) => {
    if (!cell.draggable && cell.type !== 'operation') return;

    e.dataTransfer.setData('text/plain', JSON.stringify({ cell, index }));
    setDraggedItem(cell);

    setTimeout(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = '0.4';
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();

    if (
      cells[index].type === 'operation' ||
      (cells[index].type === 'digit' && draggedItem?.type === 'operation')
    ) {
      setTargetIndex(index);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
    setDraggedItem(null);
    setTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();

    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    const { cell: sourceCell, index: sourceIndex } = JSON.parse(data);

    if (sourceCell.type !== 'operation') return;

    if (cells[index].type === 'digit') {
      const operationIndex =
        index > 0 && cells[index - 1].type === 'operation'
          ? index - 1
          : index < cells.length - 1 && cells[index + 1].type === 'operation'
            ? index + 1
            : -1;

      if (operationIndex === -1) return;
      return handleOperationDrop(sourceCell, sourceIndex, operationIndex);
    }

    handleOperationDrop(sourceCell, sourceIndex, index);
  };

  const handleOperationDrop = (sourceCell: Cell, sourceIndex: number, targetIndex: number) => {
    const newCells = [...cells];
    setHistory((prev) => [...prev, [...cells]]);

    const isAddingBracket =
      (sourceCell.value === '(' || sourceCell.value === ')') &&
      newCells[targetIndex].value !== '(' &&
      newCells[targetIndex].value !== ')';

    if (sourceIndex === -1) {
      newCells[targetIndex] = {
        ...newCells[targetIndex],
        value: sourceCell.value,
      };

      if (isAddingBracket) {
        insertOperationSlotsForBracket(newCells, targetIndex, sourceCell.value);
      }

      setCells([...newCells]);
    } else {
      const temp = newCells[targetIndex].value;
      newCells[targetIndex] = {
        ...newCells[targetIndex],
        value: sourceCell.value,
      };
      newCells[sourceIndex] = { ...newCells[sourceIndex], value: temp };

      if (isAddingBracket) {
        insertOperationSlotsForBracket(newCells, targetIndex, sourceCell.value);
      }

      setCells([...newCells]);
    }

    checkSolution(newCells);
  };

  const insertOperationSlotsForBracket = (
    cellsArray: Cell[],
    bracketIndex: number,
    bracketType: string
  ) => {
    let modified = false;

    if (bracketType === '(') {
      if (bracketIndex > 0) {
        if (cellsArray[bracketIndex - 1].type !== 'operation') {
          const newOpSlot: Cell = {
            type: 'operation',
            value: '',
            id: `op-new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            draggable: true,
          };

          cellsArray.splice(bracketIndex, 0, newOpSlot);
          bracketIndex++;
          modified = true;
          setMessage('Operation slot added before bracket. Add an operator here.');
        }
      }

      if (
        bracketIndex < cellsArray.length - 1 &&
        cellsArray[bracketIndex + 1].type !== 'operation'
      ) {
        const newOpSlot: Cell = {
          type: 'operation',
          value: '',
          id: `op-new-inside-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          draggable: true,
        };

        cellsArray.splice(bracketIndex + 1, 0, newOpSlot);
        modified = true;
        setMessage('Operation slot added inside bracket. Start building your expression.');
      }
    } else if (bracketType === ')') {
      if (bracketIndex < cellsArray.length - 1 && cellsArray[bracketIndex + 1].type === 'digit') {
        const newOpSlot: Cell = {
          type: 'operation',
          value: '',
          id: `op-new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          draggable: true,
        };

        cellsArray.splice(bracketIndex + 1, 0, newOpSlot);
        modified = true;
        setMessage('Operation slot added after closing bracket. Add an operator here.');
      }

      if (
        bracketIndex < cellsArray.length - 1 &&
        cellsArray[bracketIndex + 1].value &&
        (cellsArray[bracketIndex + 1].value === '(' || cellsArray[bracketIndex + 1].value === ')')
      ) {
        const newOpSlot: Cell = {
          type: 'operation',
          value: '',
          id: `op-new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          draggable: true,
        };

        cellsArray.splice(bracketIndex + 1, 0, newOpSlot);
        modified = true;
        setMessage('Operation slot added between brackets. Add an operator here.');
      }
    }

    return modified;
  };

  const checkSolution = (currentCells: Cell[]) => {
    let expression = '';
    let currentNumber = '';
    let needsConcat = false;

    currentCells.forEach((cell) => {
      if (cell.type === 'digit') {
        if (needsConcat) {
          currentNumber += cell.value;
          needsConcat = false;
        } else {
          if (currentNumber) expression += currentNumber;
          currentNumber = cell.value;
        }
      } else if (cell.type === 'operation' && cell.value) {
        if (cell.value === '(' || cell.value === ')') {
          expression += currentNumber + cell.value;
          currentNumber = '';
          needsConcat = false;
        } else {
          expression += currentNumber + cell.value;
          currentNumber = '';
          needsConcat = cell.value === '';
        }
      } else if (cell.type === 'operation' && !cell.value) {
        needsConcat = true;
      }
    });

    expression += currentNumber;

    try {
      const processedExpression = expression.replace(/\^/g, '**');

      if (expression.match(/\d\(/) || expression.match(/\)\d/)) {
        setMessage('You need to add an operation between digits and brackets');
        return;
      }

      const result = eval(processedExpression);

      if (Math.abs(result - 100) < 0.0001) {
        setMessage('Congratulations! You solved it!');
      } else {
        setMessage(`Current value: ${result}. `);
      }
    } catch {
      setMessage('Invalid expression. Keep trying!');
    }
  };

  const undoMove = () => {
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    setCells(previousState);
    setHistory((prev) => prev.slice(0, -1));
    setMessage('Move undone. Keep trying!');
  };

  const resetGame = () => {
    const newCells = cells.map((cell) =>
      cell.type === 'operation' ? { ...cell, value: '' } : cell
    );
    setCells(newCells);
    setMessage('Drag operations between digits to make 100');
    setHistory([]);
  };

  const availableOperations: Operation[] = ['+', '-', '*', '/', '(', ')'];

  const handleOperationsPanelDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    const { cell: sourceCell, index: sourceIndex } = JSON.parse(data);

    if (sourceCell.type !== 'operation' || sourceIndex === -1) return;

    setHistory((prev) => [...prev, [...cells]]);

    const newCells = [...cells];
    newCells[sourceIndex] = {
      ...newCells[sourceIndex],
      value: '',
    };

    setCells(newCells);
    checkSolution(newCells);
  };

  // Add this function for mobile touch handling
  const handleTouchStart = (e: React.TouchEvent, cell: Cell, index: number) => {
    if (!cell.draggable) return;
    
    setTouchDragging(true);
    setTouchSourceIndex(index);
    setTouchSourceCell(cell);
    setTouchPosition({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    
    // Create visual feedback
    const element = e.currentTarget;
    element.classList.add('touch-dragging');
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragging) return;
    
    e.preventDefault(); // Prevent scrolling while dragging
    
    setTouchPosition({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    
    // Find drop target element under the touch point
    const elementsAtPoint = document.elementsFromPoint(touchPosition.x, touchPosition.y);
    const dropTargetEl = elementsAtPoint.find(el => 
      el.classList.contains('operation-slot') || el.classList.contains('digit-cell')
    );
    
    // Highlight potential drop target
    document.querySelectorAll('.highlight-drop-target').forEach(el => 
      el.classList.remove('highlight-drop-target')
    );
    
    if (dropTargetEl) {
      dropTargetEl.classList.add('highlight-drop-target');
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragging) return;
    
    const element = e.currentTarget;
    element.classList.remove('touch-dragging');
    
    // Find drop target element under the final touch point
    const elementsAtPoint = document.elementsFromPoint(touchPosition.x, touchPosition.y);
    const dropTargetEl = elementsAtPoint.find(el => 
      el.classList.contains('operation-slot') || el.classList.contains('digit-cell')
    );
    
    if (dropTargetEl && touchSourceCell) {
      const targetIndex = parseInt(dropTargetEl.getAttribute('data-index') || '-1');
      
      if (targetIndex !== -1) {
        if (cells[targetIndex].type === 'digit') {
          const operationIndex =
            targetIndex > 0 && cells[targetIndex - 1].type === 'operation'
              ? targetIndex - 1
              : targetIndex < cells.length - 1 && cells[targetIndex + 1].type === 'operation'
                ? targetIndex + 1
                : -1;

          if (operationIndex !== -1) {
            handleOperationDrop(touchSourceCell, touchSourceIndex, operationIndex);
          }
        } else {
          handleOperationDrop(touchSourceCell, touchSourceIndex, targetIndex);
        }
      }
    }
    
    // Clear states
    setTouchDragging(false);
    setTouchSourceIndex(-1);
    setTouchSourceCell(null);
    
    // Remove all highlights
    document.querySelectorAll('.highlight-drop-target').forEach(el => 
      el.classList.remove('highlight-drop-target')
    );
  };

  return (
    <div className='flex flex-col items-center min-h-screen bg-black text-white max-w-md mx-auto'>
      {/* Player scores - simplified for mobile */}
      <div className='w-full flex justify-between px-2 mt-10'>
        <div className='flex flex-col items-center'>
          <div className='w-10 h-10 bg-white rounded-md'></div>
          <div className='mt-1 text-sm'>You</div>
          <div className='text-xs text-gray-400'>12 XP</div>
          <div className='mt-1 bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs'>
            0
          </div>
        </div>
        <div className='flex flex-col items-center'>
          <div className='w-10 h-10 bg-white rounded-md'></div>
          <div className='text-xs text-gray-400 text-right'>20 XP</div>
          <div className='text-right text-sm'>Ranjan</div>
          <div className='mt-1 bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs'>
            0
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className='mt-4 relative'>
        <div className='w-14 h-14 rounded-xl border border-teal-500 flex items-center justify-center'>
          <div className='text-teal-500 text-sm'>0:{timeLeft.toString().padStart(2, '0')}</div>
        </div>
      </div>

      {/* Game board */}
      <div className='relative w-full mt-3 border-t border-gray-800' ref={gameAreaRef}>
        {/* Replace the static grid with the dynamic cells from state */}
        <div className='flex flex-wrap justify-center gap-1 mt-4 px-2'>
          {cells.map((cell, index) => (
            <div
              key={cell.id}
              data-index={index}
              className={`flex items-center justify-center h-9 w-9 ${
                cell.type === 'digit'
                  ? 'text-white text-lg font-medium digit-cell'
                  : cell.value
                    ? 'bg-green-800 rounded-md'
                    : 'bg-gray-800 border border-dashed border-gray-500 rounded-md operation-slot'
              }`}
              draggable={cell.draggable}
              onDragStart={(e) => cell.draggable && handleDragStart(e, cell, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => cell.draggable && handleTouchStart(e, cell, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {cell.value}
            </div>
          ))}
        </div>

        {/* Dragged item visual representation for mobile */}
        {touchDragging && touchSourceCell && (
          <div 
            className="absolute bg-green-800 rounded-md w-9 h-9 flex items-center justify-center pointer-events-none z-10 touch-dragging-visual"
            style={{
              left: `${touchPosition.x - 18}px`,
              top: `${touchPosition.y - 18}px`
            }}
          >
            {touchSourceCell.value || 
             (touchSourceCell.id.includes('plus') ? '+' : 
              touchSourceCell.id.includes('minus') ? '-' : 
              touchSourceCell.id.includes('multiply') ? '×' : 
              touchSourceCell.id.includes('divide') ? '/' :
              touchSourceCell.id.includes('left-bracket') ? '(' :
              touchSourceCell.id.includes('right-bracket') ? ')' :
              touchSourceCell.id.includes('exponent') ? '^' : '')}
          </div>
        )}

        {/* Result area */}
        <div className='mx-auto mt-4 w-full max-w-xs h-12 bg-gray-700 rounded-md flex items-center justify-center px-2'>
          <div className='text-lg font-medium text-white truncate'>
            {message.includes('Current value:') ? message : ''}
          </div>
        </div>

        {/* Instructions */}
        <div className='text-center mt-2 text-xs text-gray-300 px-2'>
          {!message.includes('Current value:') ? message : 'Drag the operations in the gaps'}
        </div>
      </div>

      {/* Operation buttons - more compact layout */}
      <div className='grid grid-cols-4 gap-2 mt-4 px-4 w-full max-w-xs'>
        <div
          className='w-12 h-12 bg-green-900 rounded-full flex items-center justify-center cursor-grab touch-action-none'
          draggable
          data-op="+"
          onDragStart={(e) =>
            handleDragStart(
              e,
              { type: 'operation', value: '+', id: 'op-plus', draggable: true },
              -1
            )
          }
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => 
            handleTouchStart(
              e,
              { type: 'operation', value: '+', id: 'op-plus', draggable: true },
              -1
            )
          }
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Plus className='text-green-400' />
        </div>
        <div
          className='w-12 h-12 bg-green-900 rounded-full flex items-center justify-center cursor-grab touch-action-none'
          draggable
          data-op="-"
          onDragStart={(e) =>
            handleDragStart(
              e,
              { type: 'operation', value: '-', id: 'op-minus', draggable: true },
              -1
            )
          }
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => 
            handleTouchStart(
              e,
              { type: 'operation', value: '-', id: 'op-minus', draggable: true },
              -1
            )
          }
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Minus className='text-green-400' />
        </div>
        <div
          className='w-12 h-12 bg-green-900 rounded-full flex items-center justify-center cursor-grab touch-action-none'
          draggable
          data-op="*"
          onDragStart={(e) =>
            handleDragStart(
              e,
              { type: 'operation', value: '*', id: 'op-multiply', draggable: true },
              -1
            )
          }
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => 
            handleTouchStart(
              e,
              { type: 'operation', value: '*', id: 'op-multiply', draggable: true },
              -1
            )
          }
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <X className='text-green-400' />
        </div>
        <div
          className='w-12 h-12 bg-green-900 rounded-full flex items-center justify-center cursor-grab touch-action-none'
          draggable
          data-op="/"
          onDragStart={(e) =>
            handleDragStart(
              e,
              { type: 'operation', value: '/', id: 'op-divide', draggable: true },
              -1
            )
          }
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => 
            handleTouchStart(
              e,
              { type: 'operation', value: '/', id: 'op-divide', draggable: true },
              -1
            )
          }
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className='text-green-400 text-xl'>/</span>
        </div>
      </div>

      {/* Parentheses and other buttons */}
      <div className='grid grid-cols-4 gap-2 mt-2 px-4 w-full max-w-xs'>
        <div
          className='w-12 h-12 bg-green-900 rounded-full flex items-center justify-center cursor-grab touch-action-none'
          draggable
          data-op="("
          onDragStart={(e) =>
            handleDragStart(
              e,
              { type: 'operation', value: '(', id: 'op-left-bracket', draggable: true },
              -1
            )
          }
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => 
            handleTouchStart(
              e,
              { type: 'operation', value: '(', id: 'op-left-bracket', draggable: true },
              -1
            )
          }
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className='text-green-400 text-xl'>(</span>
        </div>
        <div
          className='w-12 h-12 bg-green-900 rounded-full flex items-center justify-center cursor-grab touch-action-none'
          draggable
          data-op=")"
          onDragStart={(e) =>
            handleDragStart(
              e,
              { type: 'operation', value: ')', id: 'op-right-bracket', draggable: true },
              -1
            )
          }
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => 
            handleTouchStart(
              e,
              { type: 'operation', value: ')', id: 'op-right-bracket', draggable: true },
              -1
            )
          }
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className='text-green-400 text-xl'>)</span>
        </div>
        <div
          className='w-12 h-12 bg-green-900 rounded-full flex items-center justify-center cursor-grab touch-action-none'
          draggable
          data-op="^"
          onDragStart={(e) =>
            handleDragStart(
              e,
              { type: 'operation', value: '^', id: 'op-exponent', draggable: true },
              -1
            )
          }
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => 
            handleTouchStart(
              e,
              { type: 'operation', value: '^', id: 'op-exponent', draggable: true },
              -1
            )
          }
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className='text-green-400 text-xl'>^</span>
        </div>
        <div
          className='w-12 h-12 bg-green-900 rounded-full flex items-center justify-center cursor-pointer'
          onClick={undoMove}
        >
          <span className='text-green-400 text-sm'>Undo</span>
        </div>
      </div>

      {/* Hint and Reset buttons */}
      <div className='flex justify-center gap-4 mt-4 w-full max-w-xs'>
        <button
          className='flex items-center gap-1 bg-gray-800 text-white px-3 py-2 rounded-full text-sm'
          onClick={() => {
            // Simple hint system
            const hasMultiplication = cells.some((cell) => cell.value === '*');
            const hasBrackets = cells.some((cell) => cell.value === '(' || cell.value === ')');

            if (!hasMultiplication) {
              setMessage('Hint: Try using multiplication to get larger values');
            } else if (!hasBrackets) {
              setMessage('Hint: Try using parentheses to control calculation order');
            } else {
              setMessage('Hint: Try different combinations to reach 100');
            }
          }}
        >
          <Lightbulb size={16} />
          <span>Hint</span>
        </button>
        <button
          className='flex items-center gap-1 bg-gray-800 text-white px-3 py-2 rounded-full text-sm'
          onClick={resetGame}
        >
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default HectocGame;
