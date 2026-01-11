// Ce fichier dit à TypeScript de ne pas paniquer sur les éléments personnalisés
declare namespace JSX {
  interface IntrinsicElements {
    'lottie-player': any;
  }
}
