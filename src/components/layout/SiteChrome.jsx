// src/components/layout/SiteChrome.jsx
import Footer from './Footer';
import ResponsiveNavBar from './ResponsiveNavBar';
import ResponsiveMobileFooter from './ResponsiveMobileFooter';
import SiteChromeRuntime from './SiteChromeRuntime';

export default function SiteChrome({ children, footer = null }) {
  const footerNode = footer === false ? null : footer || <Footer />;

  return (
    <div className="bg-main text-white" suppressHydrationWarning>
      <ResponsiveNavBar />

      <div className="min-h-screen pb-20 lg:pb-0">{children}</div>

      {footerNode ? <div className="mb-16 lg:mb-0">{footerNode}</div> : null}

      <ResponsiveMobileFooter />
      <SiteChromeRuntime />
    </div>
  );
}
