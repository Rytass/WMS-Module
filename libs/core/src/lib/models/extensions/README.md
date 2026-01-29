# Order Management Entities

This directory contains all order-related entities for the WMS system. Each order type follows a consistent three-entity pattern to manage inventory operations.

## Entity Pattern

Each order group consists of three interconnected entities:

### 1. `*.order.entity.ts` - Order Master

**Purpose**: Groups order items together, representing a single user-initiated order operation.

**Characteristics**:

- Represents a creation event from the user
- Contains metadata like `key`, `description`, `createdAt`
- Has a one-to-many relationship with items
- May include specific fields depending on order type (e.g., `vendor`, `customer`, `reason`, `inspector`)

**Example**: `HoldInventoryOrderEntityClass`

- Groups multiple items that need to be held together
- Single order can affect multiple locations/batches

---

### 2. `*.order-item.entity.ts` - Order Item (Line Item)

**Purpose**: Defines which material will be manipulated, by which batch, at which location, with which loader, and what quantity.

**Characteristics**:

- Many-to-one relationship with the order
- References metadata: `Location`, `Loader`, `Material` (implied through usage)
- Specifies the target quantity for the action (e.g., `targetHeldQuantity`, `targetTransferredQuantity`)
- May be partially or fully executed

**Structure**:

```
- material (via external reference)
- batch (via external reference)
- location (uuid reference)
- loader (uuid reference)
- targetQuantity (numeric)
- order (reference to parent order)
```

**Example**: `HoldInventoryOrderItemEntityClass`

- Specifies that 100 units of Material X in Batch Y at Location Z should be held
- May use Loader A for the operation

---

### 3. `*.order-change.entity.ts` - Order Change (Execution Record)

**Purpose**: Records the actual execution of an item, which may be partial or complete.

**Characteristics**:

- Many-to-one relationship with order items
- One-to-one relationship with system `Order` (from base module)
- Records `quantityChanged` - the actual quantity executed
- Triggers the creation of corresponding stock records

**Key Logic**:
When an `order-change` is created, it automatically creates one or more `Stock` records based on the order type.

---

## Stock Records Created by Order Changes

Different order types create different stock records:

### Single Stock Record

- **receive-inventory-order**: Creates **+n** quantity record
- **ship-inventory-order**: Creates **-n** quantity record
- **transfer-order**: Creates **-n** (from source) and **+n** (at destination)

### Multiple Stock Records (Inventory Status Change)

- **hold-inventory-order**: Creates **2** records
  1. **+n** quantity with status: `HELD`
  2. **-n** quantity from status: `FREE`

- **release-inventory-order**: Creates **2** records
  1. **-n** quantity from status: `HELD`
  2. **+n** quantity with status: `FREE`

- **allocate-inventory-order**: Creates **2** records
  1. **+n** quantity with status: `ALLOCATED`
  2. **-n** quantity from status: `FREE`

- **deallocate-inventory-order**: Creates **2** records
  1. **-n** quantity from status: `ALLOCATED`
  2. **+n** quantity with status: `FREE`

- **quality-inspection-order**: Creates **1-2** records
  - Full pass: **-n** from `FREE` or current status
  - Partial fail: **-n** failed, **+n** defective

- **Other order types**: Follow similar patterns based on inventory flow

---

## Actual Inventory Calculation

The actual inventory is determined by aggregating and summing all stock records:

```
SELECT
  material_id,
  batch_id,
  location_id,
  loader_id,
  status,
  SUM(quantity) as total_quantity
FROM stocks
GROUP BY material_id, batch_id, location_id, loader_id, status
HAVING SUM(quantity) > 0
```

**Dimensions**:

- `material`: Which product
- `batch`: Which batch/lot
- `location`: Where it is stored
- `loader`: Which loader/container holds it
- `status`: Inventory classification (FREE, HELD, ALLOCATED, DEFECTIVE, etc.)

---

## Order Type Examples

### Hold Inventory Order

```
Order → Items → Changes → 2 Stock Records
  Item: 100 units at Location A
    ↓
  Change: Execute 100 units
    ↓
  Stocks:
    1. +100 (HELD) at Location A
    2. -100 (FREE) at Location A
```

### Transfer Inventory Order

```
Order → Items → Changes → Multiple Stock Records
  Item: 50 units from Location A to Location B
    ↓
  Change: Execute 50 units
    ↓
  Stocks:
    1. -50 at Location A
    2. +50 at Location B
```

---

## Data Flow Summary

```
User Action
    ↓
Order Created (*.order.entity)
    ↓
Order Items Added (*.order-item.entity)
    ↓
Order Execution (*.order-change.entity)
    ↓
Stock Records Created
    ↓
Inventory Available for Query
    (Grouped by: material + batch + location + loader + status)
```

---

## File Organization

```
extensions/
├── README.md (this file)
├── receive-inventory-order/
│   ├── receive-inventory-order.entity.ts
│   ├── receive-inventory-order-item.entity.ts
│   └── receive-inventory-order-change.entity.ts
├── ship-inventory-order/
├── transfer-order/
├── hold-inventory-order/
├── release-inventory-order/
├── allocate-inventory-order/
├── deallocate-inventory-order/
├── split-batch-order/
├── merge-batch-order/
├── reclassify-inventory-order/
├── transfer-vendor-order/
├── return-vendor-order/
├── quality-inspection-order/
├── transfer-customer-order/
├── return-customer-order/
└── index.ts (exports all entities)
```

---

## Key Design Principles

1. **Three-Layer Model**: Order → Items → Changes ensures traceability
2. **Immutable History**: All changes are recorded as new records, never modified
3. **Stock-Based Inventory**: No direct quantity fields; inventory is calculated from stocks
4. **Status Tracking**: Stock records track material status through its lifecycle
5. **Flexibility**: Partial execution supported through quantity-based changes
6. **Auditability**: Every stock movement is traceable to an order and change record
