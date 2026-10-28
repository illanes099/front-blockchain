import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";

export const SuccessModal = ({
  open,
  onClose,
  message,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative bg-white/80 backdrop-blur-xl border border-blue-600/40 shadow-2xl rounded-3xl px-8 py-7 max-w-sm w-full text-center text-slate-900"
          >
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 border border-green-300">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <h2 className="text-lg font-semibold tracking-wide text-slate-900">
              ¡Operación exitosa!
            </h2>

            <p className="mt-2 text-sm text-slate-700 uppercase">{message}</p>

            <button
              onClick={onClose}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-transform duration-150 active:scale-95"
            >
              Entendido
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
