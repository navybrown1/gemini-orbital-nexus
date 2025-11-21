import { Planet } from './types';

export const SYSTEM_INSTRUCTION = `
You are Dr. Nexus, the ship's AI Commander and senior astrophysicist on the Orbital Nexus exploration vessel.
Your voice is deep, calm, intelligent, and authoritative, like a seasoned scientist or a high-end documentary narrator (e.g., Carl Sagan, Neil deGrasse Tyson).
You are communicating directly with the pilot (the user) via a neural link.

Behavioral Guidelines:
1.  **Scientific Accuracy**: Always be scientifically grounded. Use correct terminology (e.g., "orbital period," "atmospheric composition," "silicate crust").
2.  **Tone**: Wonder, awe, and precision. Space is dangerous but beautiful.
3.  **Brevity**: Keep initial responses concise (2-3 sentences) unless asked for a "Deep Scan" or detailed explanation.
4.  **Interaction**: When the user selects a planet, brief them on it. If they ask to "scan", describe the visual data coming in from the sensors vividly.

Example Interaction:
User: Selects Mars.
Dr. Nexus: "Target confirmed: Mars. The Red Planet. A cold, desert world with a thin carbon dioxide atmosphere. Note the massive shield volcanoes and the scar of Valles Marineris."
`;

export const PLANETS: Planet[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    color: '#A0A0A0',
    radius: 8,
    distance: 60,
    speed: 0.02,
    description: "The swift iron planet, scorched by the Sun and frozen in its shadows. Its cratered surface tells a violent history of bombardment.",
    type: 'Terrestrial',
    atmosphere: 'Trace Exosphere',
    angle: Math.random() * Math.PI * 2
  },
  {
    id: 'venus',
    name: 'Venus',
    color: '#E6C229',
    radius: 14,
    distance: 90,
    speed: 0.015,
    description: "A cautionary tale of the greenhouse effect gone wrong. Crushing atmospheric pressure and clouds of sulfuric acid hide a hellish volcanic landscape.",
    type: 'Terrestrial',
    atmosphere: 'Super-Critical CO2',
    angle: Math.random() * Math.PI * 2
  },
  {
    id: 'earth',
    name: 'Earth',
    color: '#2E86AB',
    radius: 15,
    distance: 130,
    speed: 0.01,
    description: "The pale blue dot. A rare oasis of liquid water and life, shielded by a magnetic field and a nitrogen-oxygen atmosphere.",
    type: 'Terrestrial',
    atmosphere: 'Nitrogen-Oxygen',
    angle: Math.random() * Math.PI * 2
  },
  {
    id: 'mars',
    name: 'Mars',
    color: '#D65108',
    radius: 10,
    distance: 170,
    speed: 0.008,
    description: " The Red Planet. A cold desert world that once flowed with water. Its iron-oxide rust dust coats a surface of extinct volcanoes and vast canyons.",
    type: 'Terrestrial',
    atmosphere: 'Thin CO2',
    angle: Math.random() * Math.PI * 2
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    color: '#CFA376',
    radius: 35,
    distance: 240,
    speed: 0.004,
    description: "The King of Planets. A colossus of hydrogen and helium, guarding the inner system. Its Great Red Spot is a storm that has raged for centuries.",
    type: 'Gas Giant',
    atmosphere: 'Hydrogen-Helium',
    angle: Math.random() * Math.PI * 2
  },
  {
    id: 'saturn',
    name: 'Saturn',
    color: '#E0C893',
    radius: 30,
    distance: 320,
    speed: 0.003,
    description: "The Jewel of the Solar System. Its magnificent ring system is a complex dance of ice and rock, orbiting a giant ball of gas.",
    type: 'Gas Giant',
    atmosphere: 'Hydrogen-Helium',
    angle: Math.random() * Math.PI * 2
  }
];