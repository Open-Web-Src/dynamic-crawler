import { GridColDef } from "@mui/x-data-grid";

const calculateWidth = (headerName: string) => {
  const baseWidth = 100; // base width for columns
  const charWidth = 10; // approximate width per character
  return Math.max(baseWidth, headerName.length * charWidth);
};

export const dashboardColumns: GridColDef[] = [
  // {
  //   field: "rank",
  //   headerName: "Rank",
  //   width: calculateWidth("Rank"),
  //   filterable: false,
  // },
  {
    field: "address",
    headerName: "Property Address",
    width: calculateWidth("Property Address"),
    filterable: true,
  },
  {
    field: "state",
    headerName: "State",
    width: calculateWidth("State"),
    filterable: true,
  },
  {
    field: "suburb",
    headerName: "Suburb",
    width: calculateWidth("Suburb"),
    filterable: true,
  },
  {
    field: "postcode",
    headerName: "Post Code",
    width: calculateWidth("Post Code"),
    filterable: true,
  },
  {
    field: "advertised_price",
    headerName: "Advertised Price",
    width: calculateWidth("Advertised Price"),
    filterable: true,
  },
  {
    field: "bed",
    headerName: "Bed",
    width: calculateWidth("Bed"),
    filterable: true,
  },
  {
    field: "bath",
    headerName: "Bath",
    width: calculateWidth("Bath"),
    filterable: true,
  },
  {
    field: "car",
    headerName: "Car",
    width: calculateWidth("Car"),
    filterable: true,
  },
  {
    field: "size",
    headerName: "Size (m2)",
    width: calculateWidth("Size (m2)"),
    filterable: true,
  },
  {
    field: "frontage",
    headerName: "Frontage",
    width: calculateWidth("Frontage"),
    filterable: false,
  },
  {
    field: "council",
    headerName: "Council",
    width: calculateWidth("Council"),
    filterable: false,
  },
  {
    field: "date_listed",
    headerName: "Date Listed",
    width: calculateWidth("Date Listed"),
    filterable: false,
  },
  {
    field: "days_on_market",
    headerName: "Days on Market",
    width: calculateWidth("Days on Market"),
    filterable: true,
  },
  {
    field: "a_subdivision_gross_profit_on_cost",
    headerName: "a-Subdivision",
    width: calculateWidth("a-Subdivision"),
    filterable: false,
    valueFormatter: (value: any) => `${value}%`,
  },
  {
    field: "b_subdivision_reno_gross_profit_on_cost",
    headerName: "Subdivision & Reno",
    width: calculateWidth("Subdivision & Reno"),
    filterable: false,
    valueFormatter: (value: any) => `${value}%`,
  },
  {
    field: "c_demolish_subdivision_gross_profit_on_cost",
    headerName: "Demolish & Subdivision",
    width: calculateWidth("Demolish & Subdivision"),
    filterable: false,
    valueFormatter: (value: any) => `${value}%`,
  },
  {
    field: "d_demolish_duplex_gross_profit_on_cost",
    headerName: "Demolish & Duplex",
    width: calculateWidth("Demolish & Duplex"),
    filterable: false,
    valueFormatter: (value: any) => `${value}%`,
  },
  {
    field: "e_subdivision_reno_duplex_gross_profit_on_cost",
    headerName: "Subdivision & Reno & Duplex",
    width: calculateWidth("Subdivision & Reno & Duplex"),
    filterable: false,
    valueFormatter: (value: any) => `${value}%`,
  },
  {
    field: "f_demolish_townhouse_gross_profit_on_cost",
    headerName: "Demolish & Townhouse",
    width: calculateWidth("Demolish & Townhouse"),
    filterable: false,
    valueFormatter: (value: any) => `${value}%`,
  },
  {
    field: "highest_margin",
    headerName: "Highest margin",
    width: calculateWidth("Highest margin"),
    filterable: false,
    valueFormatter: (value: any) => `${value}%`,
  },
  {
    field: "feasible",
    headerName: "Feasible",
    width: calculateWidth("Feasible"),
    filterable: true,
    valueFormatter: (value: boolean) => (value ? "Yes" : "No"),
  },
];
