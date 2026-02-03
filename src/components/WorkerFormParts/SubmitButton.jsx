import React from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export default function SubmitButton({ loading }) {
  return (
    <div className="pt-6 border-t border-gray-800">
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ backgroundColor: '#ffffff' }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full py-2.5 bg-white hover:bg-gray-100 text-black font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        {loading ? 'Registering...' : 'Register Worker'}
      </motion.button>
    </div>
  )
}
