// src/components/public/ContactForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { submitGBCContactForm } from "../actions/contact-actions";

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);

      const result = await submitGBCContactForm(formData);

      if (result.success) {
        toast.success(result.message || "Message sent successfully!");
        // Reset form
        form.reset();
      } else {
        toast.error(result.error || "Failed to send message");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      id="contact-form"
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-8 rounded-xl shadow-lg"
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            placeholder="John Doe"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="john@example.com"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="phone">Phone Number (Optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+234 800 000 0000"
          className="mt-1"
          disabled={isSubmitting}
        />
      </div>

      {/* Inquiry Type */}
      <div>
        <Label htmlFor="type">Inquiry Type *</Label>
        <Select name="type" required disabled={isSubmitting}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select inquiry type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GENERAL">General Inquiry</SelectItem>
            <SelectItem value="SPONSORSHIP">Sponsorship</SelectItem>
            <SelectItem value="TECHNICAL">Technical Support</SelectItem>
            <SelectItem value="MEDIA">Media & Press</SelectItem>
            <SelectItem value="SPEAKING">Speaking Opportunity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subject */}
      <div>
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          name="subject"
          type="text"
          required
          placeholder="Brief subject of your inquiry"
          className="mt-1"
          disabled={isSubmitting}
        />
      </div>

      {/* Message */}
      <div>
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          name="message"
          required
          placeholder="Tell us more about your inquiry..."
          rows={6}
          className="mt-1"
          disabled={isSubmitting}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          "Sending..."
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </>
        )}
      </Button>

      <p className="text-sm text-gray-500 text-center">
        We'll get back to you within 24-48 hours
      </p>
    </form>
  );
}
