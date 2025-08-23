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
    hidden: { opacity: 0, y: -20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onCancel}
    >
      <motion.div
        className="relative w-[92%] sm:w-full max-w-md p-5 sm:p-6 bg-white rounded-2xl shadow-2xl border border-gray-200"
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="text-base sm:text-lg text-gray-800 mb-4 sm:mb-6 text-center">{message}</div>
        <div className="flex justify-center gap-3 sm:gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl font-semibold text-sm bg-gray-200 text-gray-900 hover:bg-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl font-semibold text-sm bg-black text-white hover:bg-gray-900"
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
