// Danh sách vùng theo thứ tự trái → phải. Mỗi vùng rộng 1800 (toạ độ thế giới, lớp 3).
import type { Region } from '../types'
import { region as gaCu } from './ga-cu'
import { region as langNgoi } from './lang-ngoi'
import { region as cayDa } from './cay-da'
import { region as ruongBacThang } from './ruong-bac-thang'
import { region as hoSen } from './ho-sen'
import { region as tuongDa } from './tuong-da'
import { region as rungReu } from './rung-reu'
import { region as thapChuong } from './thap-chuong'
import { region as canhDongHoa } from './canh-dong-hoa'
import { region as vachHaiDang } from './vach-hai-dang'

export const REGIONS: Region[] = [gaCu, langNgoi, cayDa, ruongBacThang, hoSen, tuongDa, rungReu, thapChuong, canhDongHoa, vachHaiDang]
