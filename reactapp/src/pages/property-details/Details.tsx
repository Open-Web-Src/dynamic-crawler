import React, { Component } from "react";
import {
  Container,
  Grid,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Alert,
  Snackbar,
  Box,
  IconButton,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import "./style.css";

interface State {
  userInputs: {} | any;
  alertOpen: boolean;
  alertMessage: string;
  alertSeverity: any;
  loading: boolean;
}

interface DetailProps {
  id: string;
}

class Detail extends Component<DetailProps, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      userInputs: {},
      alertOpen: false,
      alertMessage: "",
      alertSeverity: "success",
      loading: false,
    } as any;

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleCloseAlert = this.handleCloseAlert.bind(this);
    this.handleDownload = this.handleDownload.bind(this);
  }

  componentDidMount(): void {
    console.log(this.props.id);
    this.fetchDetail(this.props.id);
  }

  fetchDetail = async (id: string) => {
    try {
      const detailPromise = fetch(`/backend/api/properties/${id}`, {
        method: "GET",
        credentials: "include",
      });
      const configPromise = fetch(`/backend/api/properties/config`, {
        method: "GET",
        credentials: "include",
      });

      const [resp1, resp2] = await Promise.all([detailPromise, configPromise]);

      this.setState({
        userInputs: {
          ...(await resp1.json()).data,
          ...(await resp2.json()).data,
        },
      });
      console.log(this.state.userInputs);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  handleChange(event: any, key: any) {
    const userInputs = { ...this.state.userInputs, [key]: event.target.value };
    this.setState({ userInputs });
  }
  handlePercentageChange(event: any, key: any) {
    const userInputs = {
      ...this.state.userInputs,
      [key]: event.target.value / 100,
    };
    this.setState({ userInputs });
  }

  async handleSubmit() {
    this.setState({ loading: true });
    try {
      const response1 = await fetch(
        `/backend/api/properties/${this.props.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.state.userInputs),
        }
      );

      if (!response1.ok) {
        throw new Error("Property is not updated successfully.");
      }

      const response2 = await fetch(
        `/backend/api/feasibility/${this.props.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.state.userInputs),
        }
      );

      if (!response2.ok) {
        throw new Error("Feasibility calculation is not executed");
      }
      this.setState(
        {
          alertOpen: true,
          alertMessage: "Successfully updated!",
          alertSeverity: "success",
        },
        () => {
          setTimeout(() => this.handleGoBack(), 700);
        }
      );
    } catch (error: any) {
      this.setState({
        alertOpen: true,
        alertMessage: `There was a problem with the fetch operation: ${error.message}`,
        alertSeverity: "error",
      });
    } finally {
      this.setState({ loading: false });
    }
  }

  handleCloseAlert(event: any, reason?: string) {
    if (reason === "clickaway") {
      return;
    }

    this.setState({ alertOpen: false });
  }

  async handleDownload() {
    const url = `/backend/file/download_excel/${this.props.id}`;

    await fetch(url, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = blobUrl;
        a.download = `property_detail_${this.props.id}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((error) => {
        console.error("Error fetching Excel file:", error);
      });
  }
  handleGoBack = () => {
    window.history.back();
  };

  render() {
    const { userInputs, alertOpen, alertMessage, alertSeverity, loading } =
      this.state;

    return (
      <div>
        <section>
          <Container>
            <Snackbar
              open={alertOpen}
              autoHideDuration={6000}
              onClose={this.handleCloseAlert}
            >
              <Alert onClose={this.handleCloseAlert} severity={alertSeverity}>
                {alertMessage}
              </Alert>
            </Snackbar>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <h2>Property Detail</h2>
              <IconButton
                onClick={this.handleGoBack}
                edge="end"
                sx={{
                  backgroundColor: "#357960",
                  color: "#ffffff",
                  "&:hover": {
                    backgroundColor: "#2c6d5b",
                  },
                }}
              >
                <ArrowBackIcon sx={{ color: "#ffffff" }} />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Property Address</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.address}
                    onChange={(event) => this.handleChange(event, "address")}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Listed Price</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.advertised_price}
                    onChange={(event) =>
                      this.handleChange(event, "advertised_price")
                    }
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">
                    Property Value Low
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.lower_price}
                    onChange={(event) =>
                      this.handleChange(event, "lower_price")
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">
                    Property Value Medium
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.mid_price}
                    onChange={(event) => this.handleChange(event, "mid_price")}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">
                    Property Value High
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.upper_price}
                    onChange={(event) =>
                      this.handleChange(event, "upper_price")
                    }
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">
                    Price Used in Feasibility
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.find_price}
                    onChange={(event) => this.handleChange(event, "find_price")}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                  <Typography variant="body2" alignContent={"end"}>
                    * {userInputs.find_price_description}
                  </Typography>
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Site Area (m2)</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.size}
                    onChange={(event) => this.handleChange(event, "size")}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Home Size (m2)</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.home_size}
                    onChange={(event) => this.handleChange(event, "home_size")}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Usable Land
                  </Typography>
                  <TextField
                    variant="standard"
                    disabled
                    fullWidth
                    value={userInputs.useable_land * 100}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">
                    Minimum Lot Size Subdivision (m2)
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.min_lot_size_subdivision}
                    onChange={(event) =>
                      this.handleChange(event, "min_lot_size_subdivision")
                    }
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">
                    Minimum Lot Size Duplex (m2)
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.min_lot_size_duplex}
                    onChange={(event) =>
                      this.handleChange(event, "min_lot_size_duplex")
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">
                    Minimum Frontage (m2)
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.min_frontage}
                    onChange={(event) =>
                      this.handleChange(event, "min_frontage")
                    }
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Bed</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.bed}
                    onChange={(event) => this.handleChange(event, "bed")}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Bath</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.bath}
                    onChange={(event) => this.handleChange(event, "bath")}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Car</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.car}
                    onChange={(event) => this.handleChange(event, "car")}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Council</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.council}
                    onChange={(event) => this.handleChange(event, "council")}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Zoning</Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.zoning}
                    onChange={(event) => this.handleChange(event, "zoning")}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Container>
          <footer></footer>
        </section>
        <section>
          <header></header>
          <Container>
            <h2>Purchase Costs</h2>
            <Grid container spacing={2}>
              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Stamp duty
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.stamp_duty * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Titles Office Transfer on Purchase
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.titles_office_transfer_on_purchase}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Rates Adjustments at Settlement
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.rates_adjustments_at_settlement}
                    disabled
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Conveyancing Fees
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.conveyancing_fees * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Miscellaneous Bank Fees
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.miscellaneous_bank_fees}
                    disabled
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Mortgage Registration Fee
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.mortgage_registration_fee}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Title Transfer Fee
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.title_transfer_fee}
                    disabled
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Bank Legal Fees on Purchase
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.bank_legal_fees_on_purchase * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6} style={{ color: "gray" }}>
                  <Typography variant="subtitle1">
                    Bank Property Valuation
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.bank_property_valuation}
                    disabled
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Bank Loan Application Fee
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.bank_loan_application_fee}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Insurance on Existing Buildings
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.insurance_on_existing_buildings}
                    disabled
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Rates
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.rates}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Other
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.other}
                    disabled
                  />
                </Grid>
              </Grid>
            </Grid>
          </Container>
          <footer></footer>
        </section>
        <section>
          <header></header>
          <Container>
            <h2>Interest Charges</h2>

            <Grid container spacing={2}>
              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Residential loan LVR
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.residential_loan_lvr * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Project duration (months)
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.project_duration_months}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Interest on residential loan
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.interest_on_residential_loan * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Container>
          <footer></footer>
        </section>
        <section>
          <header></header>
          <Container>
            <h2>Income assumptions</h2>
            <Grid container spacing={2}>
              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Rental term (months)
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.rental_term_months}
                    disabled
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Net Rental income (per week)
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.net_rental_income_per_week}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Renovation uplift
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.renovation_uplift * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Container>
          <footer></footer>
        </section>
        <section>
          <header></header>
          <Container>
            <h2>Selling costs</h2>

            <Grid container spacing={2}>
              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Agents Commission
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.agents_commission * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Advertising and marketing
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.advertising_and_marketing}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Conveyancing and Settlement costs
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.conveyancing_settlement_costs * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Rates adjustment on Settlement
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.rates_adjustment_on_settlement}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Mortgage discharge fee
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.mortgage_discharge_fee}
                    disabled
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Register discharge - Titles office
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.register_discharge_titles_office}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Gst liability on sales
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.gst_liability_on_sales * 100}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography style={{ color: "gray" }} variant="subtitle1">
                    Input credits
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.input_credits}
                    disabled
                  />
                </Grid>
              </Grid>
            </Grid>
          </Container>
          <footer></footer>
        </section>
        <section>
          <header></header>
          <Container>
            <h2>Development costs</h2>

            <Grid container spacing={2}>
              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography style={{ color: "gray" }} variant="subtitle1">
                    Civil Costs per Block
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.civil_costs_per_block}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Demolition Costs
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.demolition_costs}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Infrastructure & Exceptional Costs
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.infrastructure_exceptional_costs}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Professional Fees (based on Construction Cost)
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={
                      userInputs.professional_fees_based_on_construction_cost *
                      100
                    }
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Contingencies (based on Build Cost)
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.contingencies_based_on_build_cost * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Average House m2
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.average_house_m2}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Build cost m2
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.build_cost_m2}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Council Contributions - per House
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.council_contributions_per_house}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Rates, Utilities & Land Tax
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.rates_utilities_land_tax}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Months to finance
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.months_to_finance}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Interest on construction loan
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.interest_on_construction_loan * 100}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Bank Fees
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.bank_fees * 100}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Brokers Fees
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.brokers_fees * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Other Lending costs
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.other_lending_costs * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Construction deposit
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    type="number"
                    value={userInputs.construction_deposit * 100}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Construction loan LVR
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.construction_loan_lvr * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container item spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" style={{ color: "gray" }}>
                    Renovation costs
                  </Typography>
                  <TextField
                    variant="standard"
                    fullWidth
                    value={userInputs.renovation_costs * 100}
                    disabled
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "20px",
                marginTop: "20px",
                width: "100%",
              }}
            >
              <Button
                variant="contained"
                onClick={this.handleSubmit}
                disabled={loading}
                sx={{
                  backgroundColor: "#357960",
                  color: "#ffffff",
                  "&:hover": {
                    backgroundColor: "#2c6d5b",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: "white" }} />
                ) : (
                  "Save"
                )}
              </Button>
              <Button
                variant="contained"
                onClick={this.handleDownload}
                sx={{
                  marginLeft: "16px",
                  backgroundColor: "#357960",
                  color: "#ffffff",
                  "&:hover": {
                    backgroundColor: "#2c6d5b",
                  },
                }}
              >
                Download
              </Button>
            </Box>
          </Container>
          <footer></footer>
        </section>
      </div>
    );
  }
}

const DetailsWrapper = () => {
  const { id } = useParams<{ id: string }>();
  return <Detail id={id!} />;
};

export default DetailsWrapper;
