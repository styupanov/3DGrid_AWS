import { Cartesian3, Color } from 'cesium'

// const OctahedronLayer = ({ data, onClick }) => {
//   // Размер бокса уменьшается с увеличением level
//   const size = Math.max(10, 100 / data.level) // level 1 = 100m, level 5 = 20m
//
//   return (
//     <Entity
//       name={`Octahedron ${data.id}`}
//       position={Cartesian3.fromDegrees(
//         data.position.lon,
//         data.position.lat,
//         data.position.height
//       )}
//       onClick={onClick}
//     >
//       <BoxGraphics
//         dimensions={new Cartesian3(size, size, size)}
//         material={Color.RED.withAlpha(0.6)}
//       />
//     </Entity>
//   )
// }

// export default OctahedronLayer