import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { LayerListProps } from "./types";
import { LayerItem } from "./LayerItem";

export const LayerList = ({ 
  layers, 
  dragCapable = false, 
  onLayerToggle, 
  onLayerReorder,
  onLayerDownload,
  renderLayerIcon 
}: LayerListProps) => {
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && onLayerReorder) {
      const oldIndex = layers.findIndex(layer => layer.id === active.id);
      const newIndex = layers.findIndex(layer => layer.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onLayerReorder(active.id as string, newIndex);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const componentList = layers.map((layer) => (
    <LayerItem 
      layer={layer} 
      key={layer.id} 
      dragCapable={dragCapable}
      onLayerToggle={onLayerToggle}
      onLayerDownload={onLayerDownload}
      renderLayerIcon={renderLayerIcon}
    />
  ));

  return dragCapable ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={layers.map(layer => layer.id)}
        strategy={verticalListSortingStrategy}
      >
        {componentList}
      </SortableContext>
    </DndContext>
  ) : (
    <>{componentList}</>
  );
};