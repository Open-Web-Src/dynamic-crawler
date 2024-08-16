import * as React from "react";
import Button from "@mui/material/Button";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Grow from "@mui/material/Grow";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import { Backdrop, ListItemIcon, ListItemText } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

interface MenuListCompositionState {
  open: boolean;
  prevOpen: boolean;
}

class DownloadButton extends React.Component<any, MenuListCompositionState> {
  anchorRef: React.RefObject<HTMLButtonElement>;

  constructor(props: {}) {
    super(props);
    this.state = {
      open: false,
      prevOpen: false,
    };

    this.anchorRef = React.createRef<HTMLButtonElement>();

    this.handleToggle = this.handleToggle.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleListKeyDown = this.handleListKeyDown.bind(this);
  }

  handleToggle() {
    this.setState((prevState) => ({
      open: !prevState.open,
      prevOpen: prevState.open,
    }));
  }

  handleClose(event: Event | React.SyntheticEvent) {
    if (
      this.anchorRef.current &&
      this.anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    this.setState({ open: false });
  }

  handleListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Tab") {
      event.preventDefault();
      this.setState({ open: false });
    } else if (event.key === "Escape") {
      this.setState({ open: false });
    }
  }

  componentDidUpdate(prevProps: {}, prevState: MenuListCompositionState) {
    if (prevState.open === true && this.state.open === false) {
      this.anchorRef.current!.focus();
    }
  }

  handleDownloadAll = (event: Event | React.SyntheticEvent) => {
    this.props.handleDownloadAll();
    this.handleClose(event);
  };

  handleDownloadCurrentPage = (event: Event | React.SyntheticEvent) => {
    this.props.handleDownloadCurrentPage();
    this.handleClose(event);
  };

  render() {
    const { open } = this.state;

    return (
      <div style={{ paddingTop: 20 }}>
        <Button
          variant="contained"
          color="primary"
          ref={this.anchorRef}
          id="composition-button"
          aria-controls={open ? "composition-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-haspopup="true"
          onClick={this.handleToggle}
          sx={{
            backgroundColor: "#357960",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#2c6d5b",
            },
          }}
        >
          Download
        </Button>
        <Popper
          open={open}
          anchorEl={this.anchorRef.current}
          role={undefined}
          placement="bottom-start"
          transition
          disablePortal
        >
          {({ TransitionProps, placement }) => (
            <Backdrop open={open}>
              <Grow
                {...TransitionProps}
                style={{
                  transformOrigin:
                    placement === "bottom-start" ? "left top" : "left bottom",
                }}
              >
                <Paper>
                  <ClickAwayListener onClickAway={this.handleClose}>
                    <MenuList
                      autoFocusItem={open}
                      id="composition-menu"
                      aria-labelledby="composition-button"
                      onKeyDown={this.handleListKeyDown}
                    >
                      <MenuItem onClick={this.handleDownloadCurrentPage}>
                        <ListItemIcon>
                          <DownloadIcon></DownloadIcon>
                        </ListItemIcon>
                        <ListItemText>Download Current Page</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={this.handleDownloadAll}>
                        <ListItemIcon>
                          <DownloadIcon></DownloadIcon>
                        </ListItemIcon>
                        <ListItemText>Download All</ListItemText>
                      </MenuItem>
                    </MenuList>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            </Backdrop>
          )}
        </Popper>
      </div>
    );
  }
}

export default DownloadButton;
