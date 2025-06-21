import { motion } from 'framer-motion';

export default function ConfirmationDialog({ 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Yes", 
  cancelText = "Cancel" 
}) {
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, y: -50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onCancel}
    >
      <motion.div
        className="relative w-full max-w-md p-6 bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20"
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="text-lg text-white mb-6 text-center">{message}</div>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-colors duration-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg text-white bg-red-500/80 hover:bg-red-500/100 transition-colors duration-300"
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
