export interface SampleRoom {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
}

export const SAMPLE_ROOMS: SampleRoom[] = [
  {
    id: "living-nordic",
    name: "Lichte Scandinavische Woonkamer",
    category: "Woonkamer",
    description: "Ruime zithoek met houten parketvloer, grote ramen en neutrale stoffen.",
    imageUrl:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "office-compact",
    name: "Thuiswerkplek & Bureau",
    category: "Werkkamer",
    description: "Compacte kantooropstelling met bureau, monitor, bureaustoel en boekenplanken.",
    imageUrl:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "bedroom-minimal",
    name: "Serene Minimalistische Slaapkamer",
    category: "Slaapkamer",
    description: "Strak bedframe met warme textielaccenten, nachttafels en zachte ochtendverlichting.",
    imageUrl:
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "kitchen-modern",
    name: "Moderne Open Keuken & Eetruimte",
    category: "Keuken",
    description: "Strak kookeiland met composiet werkblad, barkrukken en hanglampen.",
    imageUrl:
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
  },
];
