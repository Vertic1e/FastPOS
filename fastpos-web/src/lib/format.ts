export const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const money = (amount: number, symbol = "$"): string => {
  const safe = isNaN(amount) ? 0 : amount;
  return `${symbol}${safe.toFixed(2)}`;
};

export const khr = (amount: number, symbol = "៛"): string => {
  const safe = isNaN(amount) ? 0 : Math.round(amount);
  return `${safe.toLocaleString("en-US")} ${symbol}`;
};

export const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatTime = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateTime = (date: Date | string | number): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escapeCsv = (str: string | number) => {
    const s = String(str ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
