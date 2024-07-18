import React, { useState } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import QrCodeIcon from "@mui/icons-material/QrCode";
import { QRCode } from "react-qrcode-logo";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 360,
  bgcolor: "background.paper",
  borderRadius: 2,
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
      <IconButton onClick={handleOpen} className="qrcode-icon-button" aria-label="Show QR Code">
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
            }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6"component="h2" id="qr-code-modal" gutterBottom>
            Share this Bet
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
            <QRCode value={url} size={280} />
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default QRCodeModal;