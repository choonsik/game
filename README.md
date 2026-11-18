# Manhattan Heli

A line-art helicopter game. Fly over Midtown Manhattan. Avoid the buildings. Reach the destination.

The buildings, roads, and parks come from real map data.

![Game screen](docs/screenshot.png)

## Run

The project uses Node.js 22.

```
npm install
npm run dev
```

Open the address that the command prints. Press ENTER to start.

## Controls

| Key | Action |
|---|---|
| W / S | Fly forward and back |
| A / D | Turn left and right |
| SPACE / SHIFT | Climb and descend |
| R | Restart the mission |
| L | Show or hide building names |

## Verify

```
npm run verify
```

The command checks the requirements, the text rules, the types, the unit tests, and the end-to-end test. The end-to-end test needs Chrome or Edge. Set `CHROME_PATH` if the test cannot find the browser.

## Spec

The spec, the requirements, and the change rules are in [docs/spec/SPEC.md](docs/spec/SPEC.md). The spec, the tests, and the code share one version number.

## Data and credit

Map data: OpenStreetMap contributors. The data is available under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

The file `public/data/manhattan.json` is a derived database. Run `npm run fetch-osm` to make it again. See [NOTICE.md](NOTICE.md).

## License

The code is under the MIT license. See [LICENSE](LICENSE). The map data is under the ODbL.
