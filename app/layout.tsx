import type { Metadata, Viewport } from "next";import "./globals.css";
export const metadata:Metadata={title:"Controle de rebanho - Gabriel Back",description:"Cadastro, produção, reprodução e saúde do rebanho.",manifest:"/manifest.webmanifest",applicationName:"Controle de rebanho - Gabriel Back",appleWebApp:{capable:true,title:"Rebanho Gabriel",statusBarStyle:"default"},icons:{icon:"/favicon.svg",apple:"/app-icon-180.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#111111"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
