import React, { useState } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import QrCodeIcon from "@mui/icons-material/QrCode";
import { QRCode } from "react-qrcode-logo";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 300,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

interface QRCodeModalProps {
  url: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ url }) => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <div>
      <IconButton color="primary" onClick={handleOpen}>
        <QrCodeIcon fontSize="large" />
      </IconButton>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="qr-code-modal"
        aria-describedby="qr-code-for-sharing"
      >
        <Box sx={style}>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
          <h2 id="qr-code-modal">Share this Bet</h2>
          <QRCode value={url} size={256} />
        </Box>
      </Modal>
    </div>
  );
};

export default QRCodeModal;
