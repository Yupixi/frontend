type Props = {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export default function FlashIcon({ size = 24, className, style }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
    >
      <g clipPath="url(#flashClip)">
        <path
          className="flash-bolt"
          d="M21.9999 12.6297C22.6599 11.8797 22.1299 10.7097 21.1299 10.7097H18.0399V3.50972C18.0399 2.44972 16.7199 1.94972 16.0199 2.74972L8.44995 11.3497C7.78995 12.0997 8.31994 13.2697 9.31994 13.2697H12.4099V20.4697C12.4099 21.5297 13.7299 22.0297 14.4299 21.2297L19.0599 15.9697"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path className="flash-line flash-line-1" d="M8.5 4H1.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        <path className="flash-line flash-line-2" d="M7.5 20H1.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        <path className="flash-line flash-line-3" d="M4.5 12H1.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="flashClip">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
