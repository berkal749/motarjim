import 'package:flutter/material.dart';

class GeneratedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Column(
        children: [
    AppBar(
        title: Text("Title"),
      ),
    Column(
        children: [
    Column(
          children: [
    Text("Premium Wireless Headphones Experience crystal-clear audio with noise cancellation technology."),
    ElevatedButton(
            onPressed: () {},
            semanticLabel: "Shop Now",
            child: Text("Shop Now"),
          ),
          ],
        ),
        ],
      ),
    Column(
        children: [
    Column(
          children: [
    Image.network("headphones.jpg",
          
            semanticLabel: "Wireless Headphones",),
    Text("Wireless Headphones \$99.99 High-quality wireless audio with 30-hour battery life."),
    ElevatedButton(
            onPressed: () {},
            semanticLabel: "Add to Cart",
            child: Text("Add to Cart"),
          ),
    Image.network("speaker.jpg",
          
            semanticLabel: "Bluetooth Speaker",),
    Text("Bluetooth Speaker \$49.99 Portable speaker with rich bass and 360-degree sound."),
    ElevatedButton(
            onPressed: () {},
            semanticLabel: "Add to Cart",
            child: Text("Add to Cart"),
          ),
    Image.network("earbuds.jpg",
          
            semanticLabel: "Wireless Earbuds",),
    Text("Wireless Earbuds \$79.99 Compact earbuds with active noise cancellation."),
    ElevatedButton(
            onPressed: () {},
            semanticLabel: "Add to Cart",
            child: Text("Add to Cart"),
          ),
          ],
        ),
        ],
      ),
    Container(
        child: Column(
          children: [
    Text("© 2026 ShopStore. All rights reserved."),
          ],
        ),
      ),
        ],
      ),
    );
  }
}
