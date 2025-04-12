"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, Shield, X } from "lucide-react"
import { Button } from "@/components/ui/button"

declare global {
  interface Window {
    ethereum?: any
  }
}

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentAccount, setCurrentAccount] = useState("")

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this feature.")
      return
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      setCurrentAccount(accounts[0])
    } catch (error) {
      console.error("Connection error:", error)
      alert("Wallet connection failed.")
    }
  }

  const handleLogout = () => {
    setCurrentAccount("")
  }

  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0])
      } else {
        setCurrentAccount("")
      }
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged)
    window.ethereum.on("chainChanged", handleChainChanged)

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

  return (
    <header className="border-b border-gray-700 bg-[#0F0F10]">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#B9FF66]" />
          <span className="text-3xl font-bold text-white">YoCop</span>
        </Link>

        <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/complaints/track" className="text-gray-300 hover:text-[#B9FF66] transition-colors">
            Track Complaint
          </Link>

          {currentAccount ? (
            <>
              <span className="text-white text-sm font-medium">
                {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
              </span>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-white hover:text-[#B9FF66] ml-2"
              >
                Logout
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={connectWallet}
              className="border-gray-400 hover:bg-[#B9FF66] hover:text-[#0F0F10] hover:border-[#B9FF66] text-black"
            >
              Login
            </Button>
          )}
        </nav>

        {isMenuOpen && (
          <div className="absolute top-20 left-0 right-0 bg-[#1A1A1D] z-50 border-b border-gray-700 md:hidden">
            <div className="flex flex-col p-4 space-y-4">
              <Link href="/about" className="text-gray-300 hover:text-[#B9FF66] transition-colors">About us</Link>
              <Link href="/services" className="text-gray-300 hover:text-[#B9FF66] transition-colors">Services</Link>
              <Link href="/use-cases" className="text-gray-300 hover:text-[#B9FF66] transition-colors">Use Cases</Link>
              <Link href="/pricing" className="text-gray-300 hover:text-[#B9FF66] transition-colors">Pricing</Link>
              <Link href="/blog" className="text-gray-300 hover:text-[#B9FF66] transition-colors">Blog</Link>
              {currentAccount ? (
                <span className="text-white text-sm">
                  {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
                </span>
              ) : (
                <Button
                  variant="outline"
                  onClick={connectWallet}
                  className="border-gray-400 text-white hover:bg-[#B9FF66] hover:text-[#0F0F10] hover:border-[#B9FF66]"
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
