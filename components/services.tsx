import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Smartphone,
  Cpu,
  MapPin,
  Lock,
  CheckSquare,
} from "lucide-react";

export function Services() {
  const services = [
    {
      title: "Voicemail Reporting",
      icon: Phone,
      description:
        "Report incidents via a simple phone call, analyzed by AI for quick response.",
      bgColor: "bg-[#27272A]",
    },
    {
      title: "App-Based Reporting",
      icon: Smartphone,
      description:
        "Submit complaints directly through our user-friendly mobile app.",
      bgColor: "bg-[#3F3F46]",
    },
    {
      title: "AI-Powered Analysis",
      icon: Cpu,
      description:
        "Advanced AI analyzes complaints to prioritize and categorize for efficient handling.",
      bgColor: "bg-[#18181B]",
    },
    {
      title: "Real-Time Deployment",
      icon: MapPin,
      description:
        "Swift deployment of police resources based on complaint severity and location.",
      bgColor: "bg-[#3F3F46]",
    },
    {
      title: "Blockchain Security",
      icon: Lock,
      description:
        "Secure and transparent record-keeping of all complaints and FIRs using blockchain.",
      bgColor: "bg-[#27272A]",
    },
    {
      title: "Task Management",
      icon: CheckSquare,
      description:
        "Efficient tools for police to monitor, manage, and resolve tasks and FIRs.",
      bgColor: "bg-[#18181B]",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#0F0F10]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-12">
          <div className="inline-block px-4 py-2 bg-[#B9FF66] rounded-full mb-4">
            <h2 className="text-[#0F0F10] font-bold">Features</h2>
          </div>
          <p className="text-gray-400 max-w-2xl">
            Our police complaint management system offers a range of features to
            ensure efficient and secure handling of public complaints. These
            include:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card
              key={index}
              className={`border-none ${service.bgColor} overflow-hidden`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <service.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">
                    {service.title}
                  </h3>
                  <p className="text-gray-300 opacity-90 mb-6">
                    {service.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
