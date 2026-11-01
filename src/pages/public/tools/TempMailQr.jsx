import { useEffect, useRef, useState } from 'react'
import { HiOutlineArrowDownTray, HiOutlineXMark } from 'react-icons/hi2'

/**
 * "Send this address to your phone": a QR code of the address. Scan it with the phone camera, then copy
 * or use the address there. The code is drawn in the browser (the address never leaves the page).
 */
export default function TempMailQr({ address, onClose, onCopy }) {
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)
  const dialog = useRef(null)

  useEffect(() => {
    let active = true
    setSrc('')
    setFailed(false)
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(address, { errorCorrectionLevel: 'M', margin: 2, width: 512, color: { dark: '#0b1220', light: '#ffffff' } }))
      .then((url) => { if (active) setSrc(url) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [address])

  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); if (previous && previous.focus) previous.focus() }
  }, [onClose])

  return (
    <div className="tm-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tm-modal tm-qr" role="dialog" aria-modal="true" aria-labelledby="tm-qr-title" tabIndex={-1} ref={dialog}>
        <button type="button" className="tm-btn tm-btn-ghost tm-modal-x" onClick={onClose} aria-label="Close"><HiOutlineXMark className="tm-icon" /></button>
        <p className="tm-eyebrow">Nexora Temp Mail</p>
        <h2 id="tm-qr-title">Open on your phone</h2>
        <p className="tm-hint">Point your phone camera at the code. The address appears on your phone, ready to copy.</p>
        <div className="tm-qr-box" aria-busy={!src && !failed}>
          {src ? <img src={src} alt={`QR code for ${address}`} width="256" height="256" /> : failed ? <p className="tm-hint">Could not draw the code. Copy the address instead.</p> : <div className="tm-skel" style={{ height: 256, margin: 0 }} />}
        </div>
        <p className="tm-qr-address">{address}</p>
        <div className="tm-qr-actions">
          <button type="button" className="tm-btn tm-btn-primary" onClick={() => onCopy(address, 'Address')}>Copy address</button>
          {src ? <a className="tm-btn" href={src} download={`temp-mail-${address.split('@')[0]}.png`}><HiOutlineArrowDownTray className="tm-icon" /> Save image</a> : null}
        </div>
      </div>
    </div>
  )
}
