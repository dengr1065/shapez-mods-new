# Structural

Structural is a mod that allows you to use simpler structural shape codes while setting
shapes for constant signals. These codes are often used to describe different kinds of
complex shapes. A simple example is `0110:1001`, which is equal to `--CrCr--:Cg----Cg` in
regular notation. However, there are additional features for advanced usage, such as the
ability to specify more than one color (indexed or short code).

## Hexadecimal codes

As of version 1.1.0, Structural can also parse hexadecimal notation which describes shapes
in a compact and machine-readable way. A single bit describes one quadrant; LSB is the
top-right quadrant of the first layer, MSB is the top-left quadrant of the last layer.

## Shapez Industries support

Structural supports Shapez Industries out of the box, no additional configuration is
required: shapes such as `__01:1___` will resolve to `____--Cu:Cu______`.

## Configuration

This mod can be configured using the built-in mod settings system.
