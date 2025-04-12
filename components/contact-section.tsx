"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ContactSection() {
  return (
    <section className="py-16 md:py-24 bg-[#F3F3F3] dark:bg-[#0F0F0F] transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold text-[#191A23] dark:text-white mb-4">
                Get in Touch with Us
              </h2>
              <p className="text-[#191A23]/80 dark:text-gray-300 mb-6">
                Reach out to learn more about our decentralized complaint system or get assistance with filing and tracking your complaints securely.
              </p>
              <Link href="/contact">
                <Button className="bg-[#191A23] text-white hover:bg-[#B9FF66] hover:text-[#191A23] dark:bg-white dark:text-[#191A23] dark:hover:bg-[#B9FF66] dark:hover:text-black transition-colors">
                  Contact Support
                </Button>
              </Link>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 rounded-full bg-[#191A23] dark:bg-white flex items-center justify-center">
                  <div className="text-white dark:text-[#191A23] text-4xl">✦</div>
                </div>
                <div className="absolute inset-0 border-2 border-[#B9FF66] rounded-full animate-[spin_20s_linear_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
