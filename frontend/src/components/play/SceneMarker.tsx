type SceneMarkerProps = {
  text: string;
};

export function SceneMarker({ text }: SceneMarkerProps) {
  return (
    <div className="play-scene-mark" role="separator">
      <span>{text}</span>
    </div>
  );
}
