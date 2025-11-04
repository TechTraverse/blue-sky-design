import { ChangeEvent, useCallback } from "react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RxDragHandleDots1 } from "react-icons/rx";
import { BiSolidDownload } from "react-icons/bi";
import { Button, ButtonGroup } from "@mui/material";
import { LayerItemComponentProps } from "./types";

export const LayerItem = ({ 
  layer, 
  dragCapable, 
  onLayerToggle, 
  onLayerDownload,
  renderLayerIcon 
}: LayerItemComponentProps) => {
  const { id, name, enabled, downloadable } = layer;

  const onChangeHandler = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onLayerToggle(id, checked);
  }, [id, onLayerToggle]);

  const handleDownload = useCallback(() => {
    if (downloadable && onLayerDownload) {
      onLayerDownload(layer);
    }
  }, [layer, downloadable, onLayerDownload]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragConditionalStyleAndRef = dragCapable ? {
    style,
    ref: setNodeRef,
  } : {};

  const dragConditionalListenersAndAttrs = dragCapable ? {
    ...attributes,
    ...listeners,
  } : {};

  return (
    <div className="layerWrapper" id={id} {...dragConditionalStyleAndRef}>
      {dragCapable && (
        <div
          className="dragHandle"
          {...dragConditionalListenersAndAttrs}
        >
          <RxDragHandleDots1 />
        </div>
      )}
      <div className="LayerContainer">
        <div className="layerIcon">
          {renderLayerIcon ? renderLayerIcon(layer) : (
            <div className="defaultLayerIcon" />
          )}
        </div>
        <div className="layerCardElements">
          <div>{name}</div>
        </div>
        {downloadable && onLayerDownload && (
          <ButtonGroup className="layerButtons" variant="outlined">
            <Button
              title="Download layer data"
              aria-label="Download layer data"
              onClick={handleDownload}
              size="small"
            >
              <BiSolidDownload />
            </Button>
          </ButtonGroup>
        )}
        <input
          onChange={onChangeHandler}
          type="checkbox"
          className="CheckItem"
          id={`${id}`}
          name={name}
          value={id}
          checked={enabled}
        />
      </div>
    </div>
  );
};