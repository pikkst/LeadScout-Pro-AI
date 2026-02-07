import { CompanyLead } from "../types";

export const downloadLeadsAsCSV = (
  leads: CompanyLead[], 
  location: string, 
  onDownload?: () => void
) => {
  if (leads.length === 0) return;

  // Removed "Website" and "Source" headers
  const headers = ["Name", "Category", "Email", "Description"];
  
  // Removed the corresponding data fields for Website and Source
  const rows = leads.map(l => [
    `"${l.name.replace(/"/g, '""')}"`,
    `"${l.category.replace(/"/g, '""')}"`,
    `"${l.email.replace(/"/g, '""')}"`,
    `"${l.description.replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeLocation = location.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute("href", url);
  link.setAttribute("download", `event_leads_${safeLocation}_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Execute download callback AFTER the download is triggered
  if (onDownload) {
    setTimeout(() => {
      onDownload();
    }, 100); // Small delay to ensure download started
  }
};