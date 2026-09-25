import type { CSSProperties } from 'react'

// Storefront icon set = Material Symbols Outlined (the Stitch mockups' icon
// font, loaded in index.css). Components keep familiar names so call sites
// read naturally (<Heart size={18} />); each maps to its Material ligature.

export type IconProps = {
  size?: number | string
  className?: string
  style?: CSSProperties
  color?: string
  // Any non-'none' fill renders the filled variant (e.g. a liked heart).
  fill?: string
  strokeWidth?: number
  'aria-label'?: string
  onClick?: () => void
}

export type AppIcon = (props: IconProps) => React.ReactElement

function make(name: string, alwaysFilled = false): AppIcon {
  const Comp = ({ size = 20, className, style, color, fill, strokeWidth, onClick, ...rest }: IconProps) => {
    const px = typeof size === 'number' ? size : parseInt(size, 10) || 20
    const filled = alwaysFilled || (!!fill && fill !== 'none')
    const weight = strokeWidth && strokeWidth >= 2.4 ? 600 : 400
    return (
      <span
        className={`ms${className ? ` ${className}` : ''}`}
        onClick={onClick}
        aria-hidden={rest['aria-label'] ? undefined : true}
        aria-label={rest['aria-label']}
        style={{
          fontSize: px, width: px, height: px,
          color: color ?? (filled && fill && fill !== 'currentColor' ? fill : undefined),
          fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
          ...style,
        }}
      >
        {name}
      </span>
    )
  }
  Comp.displayName = `Icon(${name})`
  return Comp
}

export const AlertCircle = make('error')
export const AlertTriangle = make('warning')
export const AlignCenter = make('format_align_center')
export const AlignLeft = make('format_align_left')
export const AlignRight = make('format_align_right')
export const Archive = make('inventory_2')
export const ArrowDown = make('arrow_downward')
export const ArrowLeft = make('arrow_back')
export const ArrowRight = make('arrow_forward')
export const ArrowUp = make('arrow_upward')
export const Award = make('workspace_premium')
export const BadgeCheck = make('verified')
export const BarChart2 = make('bar_chart')
export const Bell = make('notifications')
export const BellRing = make('notifications_active')
export const Bold = make('format_bold')
export const Briefcase = make('work')
export const Calendar = make('calendar_month')
export const Car = make('directions_car')
export const Check = make('check')
export const CheckCheck = make('done_all')
export const CheckCircle = make('check_circle')
export const CheckCircle2 = make('check_circle')
export const ChevronDown = make('expand_more')
export const ChevronLeft = make('chevron_left')
export const ChevronRight = make('chevron_right')
export const ChevronUp = make('expand_less')
export const CircleX = make('cancel')
export const Clock = make('schedule')
export const Edit3 = make('edit')
export const ExternalLink = make('open_in_new')
export const Eye = make('visibility')
export const EyeOff = make('visibility_off')
export const Flag = make('flag')
export const Flame = make('local_fire_department')
export const Gauge = make('speed')
export const Grid = make('grid_view')
export const Handshake = make('handshake')
export const Heading1 = make('format_h1')
export const Heading2 = make('format_h2')
export const Heading3 = make('format_h3')
export const Heart = make('favorite')
export const History = make('history')
export const Home = make('home')
export const Image = make('image')
export const ImageOff = make('hide_image')
export const Info = make('info')
export const Italic = make('format_italic')
export const LayoutDashboard = make('dashboard')
export const LayoutGrid = make('grid_view')
export const Lightbulb = make('lightbulb')
export const Link = make('link')
export const List = make('view_list')
export const ListOrdered = make('format_list_numbered')
export const Loader2 = make('progress_activity')
export const Lock = make('lock')
export const LogOut = make('logout')
export const Mail = make('mail')
export const MapPin = make('location_on')
export const Menu = make('menu')
export const MessageCircle = make('chat_bubble')
export const MessageSquare = make('chat')
export const Moon = make('dark_mode')
export const Package = make('package_2')
export const PawPrint = make('pets')
export const Percent = make('percent')
export const Phone = make('call')
export const Plus = make('add')
export const PlusCircle = make('add_circle')
export const Redo2 = make('redo')
export const Rocket = make('rocket_launch')
export const Search = make('search')
export const Send = make('send')
export const Settings = make('settings')
export const Share2 = make('share')
export const ShieldCheck = make('verified_user')
export const Shirt = make('checkroom')
export const SlidersHorizontal = make('tune')
export const Smartphone = make('smartphone')
export const Sparkles = make('auto_awesome')
export const Star = make('star')
export const Store = make('storefront')
export const Strikethrough = make('format_strikethrough')
export const Sun = make('light_mode')
export const Tag = make('sell')
export const Timer = make('timer')
export const Trash2 = make('delete')
export const TrendingUp = make('trending_up')
export const Truck = make('local_shipping')
export const Underline = make('format_underlined')
export const Undo2 = make('undo')
export const Upload = make('upload')
export const User = make('person')
export const UserCheck = make('how_to_reg')
export const UserPlus = make('person_add')
export const Users = make('group')
export const Wallet = make('account_balance_wallet')
export const Wrench = make('build')
export const X = make('close')
export const Zap = make('bolt')
