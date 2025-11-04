"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { FieldGroup, Field } from "../ui/field";
import { GenericInput } from "../ui/generic-input";
import { Button } from "../ui/button";
import { CardFooter } from "../ui/card";

const formSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters.")
    .max(32, "Title must be at most 32 characters."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(100, "Description must be at most 100 characters."),
  priority: z.enum(["low", "medium", "high"]),
  category: z.string().min(1, "Please select a category."),
  email: z.string().email("Please enter a valid email address."),
  severity: z.number().min(1).max(10),
  date: z.string().min(1, "Please select a date."),
  isPublic: z.boolean(),
  notificationType: z.enum(["email", "sms", "push"]),
  tags: z.array(z.string()).min(1, "Please select at least one tag."),
});

type FormData = z.infer<typeof formSchema>;

const TestForm = () => {
  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      priority: "medium" as "low" | "medium" | "high",
      category: "",
      email: "",
      severity: 5,
      date: "",
      isPublic: false,
      notificationType: "email" as "email" | "sms" | "push",
      tags: [] as string[],
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      // Console log the form data
      console.log("Form submitted with data:", value);
      console.table(value); // Nice table view in console
      
      try {
        // Example API call - replace with your actual API endpoint
        // const response = await fetch('/api/bug-reports', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(value),
        // });
        // if (!response.ok) throw new Error('Failed to submit');
        // const data = await response.json();

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        toast.success("Bug report submitted successfully!", {
          description: "Your report has been received and will be reviewed.",
          position: "bottom-right",
        });
        
        // Optionally reset form after successful submission
        // form.reset();
      } catch (error) {
        toast.error("Failed to submit bug report", {
          description: error instanceof Error ? error.message : "Please try again later.",
          position: "bottom-right",
        });
        // Re-throw to let TanStack Form handle the error state
        throw error;
      }
    },
  });
  return (
    <Card className="w-full sm:max-w-md">
      <CardHeader>
        <CardTitle>Bug Report</CardTitle>
        <CardDescription>
          Help us improve by reporting bugs you encounter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="bug-report-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {/* Typed GenericInput - fieldName is now type-safe! */}
            <GenericInput<FormData>
              form={form}
              fieldName="title"
              type="input"
              label="Bug Title"
              placeholder="Login button not working on mobile"
              autoComplete="off"
            />
            <GenericInput<FormData>
              form={form}
              fieldName="description"
              type="textarea"
              label="Description"
              description="Include steps to reproduce, expected behavior, and what actually happened."
              placeholder="I'm having an issue with the login button on mobile."
              rows={6}
              className="min-h-24 resize-none"
              showCharacterCount={true}
              maxLength={100}
            />
            <GenericInput<FormData>
              form={form}
              fieldName="priority"
              type="select"
              label="Priority"
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
            />
            <GenericInput<FormData>
              form={form}
              fieldName="category"
              type="select"
              label="Category"
              options={[
                { value: "", label: "Select a category", disabled: true },
                { value: "ui", label: "UI/UX" },
                { value: "functionality", label: "Functionality" },
                { value: "performance", label: "Performance" },
                { value: "security", label: "Security" },
                { value: "other", label: "Other" },
              ]}
            />
            <GenericInput<FormData>
              form={form}
              fieldName="email"
              type="email"
              label="Email"
              placeholder="your.email@example.com"
            />
            <GenericInput<FormData>
              form={form}
              fieldName="severity"
              type="number"
              label="Severity (1-10)"
              min={1}
              max={10}
            />
            <GenericInput<FormData>
              form={form}
              fieldName="date"
              type="date"
              label="Date"
            />
            <GenericInput<FormData>
              form={form}
              fieldName="isPublic"
              type="checkbox"
              label="Make this report public"
              fieldOrientation="horizontal"
            />
            <GenericInput<FormData>
              form={form}
              fieldName="notificationType"
              type="radio-group"
              label="Notification Type"
              orientation="horizontal"
              options={[
                { value: "email", label: "Email" },
                { value: "sms", label: "SMS" },
                { value: "push", label: "Push Notification" },
              ]}
            />
            <GenericInput<FormData>
              form={form}
              fieldName="tags"
              type="checkbox-group"
              label="Tags (Select multiple)"
              description="Select all tags that apply to this report."
              orientation="horizontal"
              options={[
                { value: "bug", label: "Bug" },
                { value: "feature", label: "Feature Request" },
                { value: "urgent", label: "Urgent" },
                { value: "documentation", label: "Documentation" },
                { value: "performance", label: "Performance" },
              ]}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => form.reset()}
            disabled={form.state.isSubmitting}
          >
            Reset
          </Button>
          <Button 
            type="submit" 
            form="bug-report-form"
            disabled={form.state.isSubmitting}
          >
            {form.state.isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
};

export default TestForm;
