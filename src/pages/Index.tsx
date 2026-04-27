import Navigation from "@/components/Navigation";
import PropHero from "@/components/prop/PropHero";
import PromoPopup from "@/components/PromoPopup";
import PropPrograms from "@/components/prop/PropPrograms";
import PropEvaluation from "@/components/prop/PropEvaluation";
import PropWhyChoose from "@/components/prop/PropWhyChoose";
import PropPlatform from "@/components/prop/PropPlatform";
import Footer from "@/components/Footer";
import DisclaimerBanner from "@/components/DisclaimerBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-16">
      <Navigation />
      <main>
        <PromoPopup />
        <PropHero />
        <PropPrograms />
        <PropEvaluation />
        <PropWhyChoose />
        <PropPlatform />
      </main>
      <Footer />
      <DisclaimerBanner />
    </div>
  );
};

export default Index;