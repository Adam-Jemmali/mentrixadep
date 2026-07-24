import QRCode from "qrcode";

export async function CertificationQrImage({
  url,
  size = 88,
}: {
  url: string;
  size?: number;
}) {
  const src = await QRCode.toDataURL(url, {
    width: size,
    margin: 0,
    color: { dark: "var(--mx-navy)", light: "#FFFFFF" },
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="block"
      aria-hidden
    />
  );
}
