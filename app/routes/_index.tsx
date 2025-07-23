import { Button } from "~/components/ui/button"
import { motion } from "framer-motion"
import { Link } from "@remix-run/react"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
  viewport: { once: true, amount: 0.3 },
}

export default function LandingPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center text-center px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.h1
            {...fadeInUp}
            className="text-5xl sm:text-7xl font-bold text-[#4285F4]"
          >
            Goodbye spreadsheets,<br />hello Smart Picker
          </motion.h1>
          <motion.p
            {...fadeInUp}
            className="text-xl text-gray-600"
          >
            Manage your stock and orders from any device
          </motion.p>
          <motion.div {...fadeInUp}>
            <Button asChild className="rounded-full text-lg px-8 py-4 bg-[#4285F4] hover:bg-blue-600 text-white">
              <Link to="/login">Try SmartPicker here</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="bg-gray-100 py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.img
            {...fadeInUp}
            src="https://t3.ftcdn.net/jpg/04/18/86/92/360_F_418869208_hK7u41kiZti2GiF9Z9ARujhlhM7pOAiv.jpg"
            alt="Barcode Scanner"
            className="rounded-2xl shadow-xl w-full max-w-md mx-auto"
          />
          <motion.div {...fadeInUp} className="space-y-4">
            <h2 className="text-3xl font-bold">Fulfill from your phone</h2>
            <p className="text-gray-600">
              Scan to receive or fulfill orders from your iPhone or Android device.
            </p>
            <Button variant="outline" className="rounded-full border-[#4285F4] text-[#4285F4] hover:bg-[#e5f1ff]">
              Learn More
            </Button>
          </motion.div>
        </div>
      </section>

      {/* QuickBooks Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.img
            {...fadeInUp}
            src="https://quickbooks.intuit.com/cas/dam/IMAGE/A732uaqi3/standardlogo.png"
            alt="QuickBooks Logo"
            className="w-full max-w-xs mx-auto"
          />
          <motion.div {...fadeInUp} className="space-y-4">
            <h2 className="text-3xl font-bold">Connects to QuickBooks Online</h2>
            <p className="text-gray-600">
              SmartPicker seamlessly integrates with QuickBooks Online accounting software to sync inventory and orders.
            </p>
            <Button variant="outline" className="rounded-full border-[#4285F4] text-[#4285F4] hover:bg-[#e5f1ff]">
              Learn More
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
