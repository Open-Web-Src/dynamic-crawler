import { Box, CircularProgress, Container } from "@mui/material";
import { DataGrid, GridEventListener } from "@mui/x-data-grid";
import * as React from "react";
import { Navigate } from "react-router-dom";
import { dashboardColumns } from "../../constants/table-header-dashboard";
import { DashboardTableData } from "../../types/dashboard-table-data";
import DownloadButton from "./DownloadButton";

interface State {
  id: string;
  rows: DashboardTableData | any;
  paginationModel: any;
  total: number;
  filterModel: any;
  loading: boolean;
}

export class Dashboard extends React.Component {
  state: State = {
    id: "",
    paginationModel: {
      page: 0, // DataGrid uses 0-based index
      pageSize: 10,
    },
    total: 0,
    rows: [],
    filterModel: {
      items: [],
    },
    loading: true,
  };

  constructor(props: any) {
    super(props);

    this.handleDownloadAll = this.handleDownloadAll.bind(this);
    this.handleDownloadCurrentPage = this.handleDownloadCurrentPage.bind(this);
  }

  componentDidMount(): void {
    this.fetchData(this.state.paginationModel, this.state.filterModel);
  }

  fetchData = async ({ page, pageSize }: any, { items }: any) => {
    const filters = items
      .map((filter: any) => `${filter.columnField}=${filter.value}`)
      .join("&");

    const queryParams = {
      page_size: pageSize,
      page: page + 1,
      for_sale: "FOR_SALE",
      ...(filters && { filter: filters }),
    };

    const queryString = new URLSearchParams(queryParams).toString();
    const url = `/backend/api/properties?${queryString}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include", // This is important for including credentials in the request
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({ rows: data.data, total: data.total, loading: false });
      } else {
        this.setState({ loading: false });
        console.error("Something went wrong");
      }
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  handlePaginationModelChange = (newPaginationModel: any) => {
    this.setState({ paginationModel: newPaginationModel, loading: false });
    this.fetchData(newPaginationModel, this.state.filterModel);
  };

  getRowId = (row: DashboardTableData): string => {
    return row._id;
  };

  handleRowClick: GridEventListener<"rowClick"> = (params) => {
    this.setState({ id: params.id });
  };

  onFilterModelChange = (newFilterModel: any) => {
    this.setState({ filterModel: newFilterModel, loading: false }, () =>
      this.fetchData(this.state.paginationModel, newFilterModel)
    );
  };

  handleDownloadAll() {
    this.handleDownload({ property_ids: [] }, "Dashboard");
  }

  handleDownloadCurrentPage() {
    this.handleDownload(
      { property_ids: this.state.rows.map((row: any) => row._id) },
      `Dashboard_${this.state.paginationModel.page + 1}_${
        this.state.paginationModel.pageSize
      }`
    );
  }

  async handleDownload(payload: any, file_name: string) {
    const url = `/backend/file/download_excel`;

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "include",
    })
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = blobUrl;
        a.download = `${file_name}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((error) => {
        console.error("Error fetching Excel file:", error);
      });
  }

  render() {
    const { id, paginationModel, total, rows, loading } = this.state;
    return (
      <div>
        {id && <Navigate to={{ pathname: `/properties/${id}` }} />}
        {loading && (
          <Box>
            <CircularProgress sx={{ width: "100%", height: "100%" }} />
          </Box>
        )}
        {!loading && (
          <Container
            style={{
              width: "100%",
              maxWidth: "none",
              padding: " 0 30px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingBottom: 50,
              }}
            >
              <h1>Dashboard</h1>

              <DownloadButton
                handleDownloadAll={this.handleDownloadAll}
                handleDownloadCurrentPage={this.handleDownloadCurrentPage}
              />
            </div>
            <DataGrid
              autoHeight
              onRowClick={this.handleRowClick}
              sx={{
                "& .MuiDataGrid-row": {
                  cursor: "pointer",
                  backgroundColor: "#ffffff",
                },
                "& .MuiDataGrid-cell": {
                  outline: "none !important",
                },
                "& .css-k008qs": {
                  backgroundColor: "#357960 !important",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  color: "white !important",
                },
                "& .MuiToolbar-root": {
                  color: "white !important",
                },
                "& .MuiTablePagination-selectIcon": {
                  color: "white !important",
                },
                "& .MuiDataGrid-footerContainer": {
                  backgroundColor: "#357960 !important",
                },
                backgroundColor: "#d9e4e6",
              }}
              getRowId={this.getRowId}
              rows={rows}
              columns={dashboardColumns}
              rowCount={total}
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={this.handlePaginationModelChange}
              pageSizeOptions={[10, 20, 50, 100]}
              filterModel={this.state.filterModel}
              onFilterModelChange={this.onFilterModelChange}
            />
          </Container>
        )}
      </div>
    );
  }
}
